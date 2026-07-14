import {
  errorResponse,
  HttpError,
  jsonResponse,
  verifyAdmin,
  type FunctionEnv,
} from "../_lib/auth";

type Context = { request: Request; env: FunctionEnv };

type FirestoreDocument = {
  fields?: {
    contentVersion?: { integerValue?: string };
  };
};

function metaUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/catalogMeta/status`;
}

async function currentContentVersion(projectId: string, token: string): Promise<number> {
  const response = await fetch(metaUrl(projectId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return 0;
  if (!response.ok) throw new HttpError(502, "No se pudo leer el estado del catálogo.");
  const data = (await response.json()) as FirestoreDocument;
  return Number(data.fields?.contentVersion?.integerValue ?? 0);
}

async function markPublicationRequested(
  projectId: string,
  token: string,
  version: number,
): Promise<void> {
  const masks = [
    "updateMask.fieldPaths=lastPublishRequestedVersion",
    "updateMask.fieldPaths=lastPublishRequestedAt",
    "updateMask.fieldPaths=publishStatus",
  ].join("&");
  const response = await fetch(`${metaUrl(projectId)}?${masks}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        lastPublishRequestedVersion: { integerValue: String(version) },
        lastPublishRequestedAt: { timestampValue: new Date().toISOString() },
        publishStatus: { stringValue: "queued" },
      },
    }),
  });
  if (!response.ok) throw new HttpError(502, "El build comenzó, pero no se pudo actualizar su estado.");
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  try {
    const admin = await verifyAdmin(request, env);
    if (!env.FIREBASE_PROJECT_ID) throw new HttpError(500, "Falta configurar Firebase en Cloudflare.");
    if (!env.CLOUDFLARE_DEPLOY_HOOK_URL) throw new HttpError(500, "Falta configurar el enlace de publicación.");

    const version = await currentContentVersion(env.FIREBASE_PROJECT_ID, admin.token);
    const hookResponse = await fetch(env.CLOUDFLARE_DEPLOY_HOOK_URL, { method: "POST" });
    if (!hookResponse.ok) throw new HttpError(502, "Cloudflare no pudo iniciar la publicación.");
    await markPublicationRequested(env.FIREBASE_PROJECT_ID, admin.token, version);
    return jsonResponse({ ok: true, version }, 202);
  } catch (error) {
    return errorResponse(error);
  }
}
