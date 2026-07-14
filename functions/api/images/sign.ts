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
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new HttpError(500, "Falta configurar Cloudinary en Cloudflare.");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = env.CLOUDINARY_FOLDER || "regalarte/catalog";
    const signature = await cloudinarySignature({ folder, timestamp }, env.CLOUDINARY_API_SECRET);
    return jsonResponse({
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      folder,
      timestamp,
      signature,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
