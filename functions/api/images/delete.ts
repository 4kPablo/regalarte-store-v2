import {
  errorResponse,
  HttpError,
  jsonResponse,
  verifyAdmin,
  type FunctionEnv,
} from "../../_lib/auth";
import { cloudinarySignature } from "../../_lib/cloudinary";

type Context = { request: Request; env: FunctionEnv };

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  try {
    await verifyAdmin(request, env);
    const body = (await request.json().catch(() => null)) as { publicId?: unknown } | null;
    if (typeof body?.publicId !== "string" || body.publicId.length > 220) {
      throw new HttpError(400, "La imagen indicada no es válida.");
    }
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new HttpError(500, "Falta configurar Cloudinary en Cloudflare.");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await cloudinarySignature(
      { invalidate: "true", public_id: body.publicId, timestamp },
      env.CLOUDINARY_API_SECRET,
    );
    const form = new FormData();
    form.set("public_id", body.publicId);
    form.set("timestamp", String(timestamp));
    form.set("invalidate", "true");
    form.set("api_key", env.CLOUDINARY_API_KEY);
    form.set("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/destroy`,
      { method: "POST", body: form },
    );
    if (!response.ok) throw new HttpError(502, "Cloudinary no pudo eliminar la imagen.");
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
