export type FunctionEnv = {
  FIREBASE_WEB_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  CLOUDFLARE_DEPLOY_HOOK_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_FOLDER?: string;
};

type FirebaseAccount = {
  localId?: string;
  email?: string;
};

export type VerifiedAdmin = {
  token: string;
  uid: string;
  email?: string;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function tokenClaims(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) return {};
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function verifyAdmin(
  request: Request,
  env: Pick<FunctionEnv, "FIREBASE_WEB_API_KEY">,
): Promise<VerifiedAdmin> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "La sesión no es válida. Volvé a ingresar.");
  }
  if (!env.FIREBASE_WEB_API_KEY) {
    throw new HttpError(500, "Falta configurar Firebase en Cloudflare.");
  }

  const token = authorization.slice("Bearer ".length);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
  );

  if (!response.ok) {
    throw new HttpError(401, "La sesión venció. Volvé a ingresar.");
  }
  const payload = (await response.json()) as { users?: FirebaseAccount[] };
  const account = payload.users?.[0];
  if (!account?.localId) throw new HttpError(401, "No se pudo comprobar la cuenta.");

  const claims = tokenClaims(token);
  if (claims.sub !== account.localId || claims.admin !== true) {
    throw new HttpError(403, "Esta cuenta no tiene permiso para realizar esta acción.");
  }

  return {
    token,
    uid: account.localId,
    ...(account.email ? { email: account.email } : {}),
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse({ message: error.message }, error.status);
  }
  console.error(error);
  return jsonResponse({ message: "No se pudo completar la operación." }, 500);
}
