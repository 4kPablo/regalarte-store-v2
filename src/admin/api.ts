import type { User } from "firebase/auth";
import type { CatalogImage } from "../types/catalog";

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  width?: number;
  height?: number;
  error?: { message?: string };
};

async function authorizedRequest(
  user: User,
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

async function responseMessage(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;
  return data?.message || `La operación falló (${response.status}).`;
}

export async function uploadProductImage(
  user: User,
  file: File,
): Promise<CatalogImage> {
  const signatureResponse = await authorizedRequest(user, "/api/images/sign", {
    method: "POST",
  });
  if (!signatureResponse.ok) throw new Error(await responseMessage(signatureResponse));
  const signed = (await signatureResponse.json()) as SignedUpload;

  const form = new FormData();
  form.set("file", file);
  form.set("api_key", signed.apiKey);
  form.set("timestamp", String(signed.timestamp));
  form.set("folder", signed.folder);
  form.set("signature", signed.signature);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`,
    { method: "POST", body: form },
  );
  const uploaded = (await uploadResponse.json()) as CloudinaryUploadResponse;
  if (!uploadResponse.ok || !uploaded.public_id || !uploaded.secure_url) {
    throw new Error(uploaded.error?.message || "No se pudo subir la imagen.");
  }

  return {
    publicId: uploaded.public_id,
    url: uploaded.secure_url,
    ...(uploaded.width ? { width: uploaded.width } : {}),
    ...(uploaded.height ? { height: uploaded.height } : {}),
  };
}

export async function deleteProductImage(
  user: User,
  publicId: string,
): Promise<void> {
  const response = await authorizedRequest(user, "/api/images/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });
  if (!response.ok) throw new Error(await responseMessage(response));
}

export async function requestCatalogPublication(user: User): Promise<number> {
  const response = await authorizedRequest(user, "/api/publish", {
    method: "POST",
  });
  if (!response.ok) throw new Error(await responseMessage(response));
  const data = (await response.json()) as { version: number };
  return data.version;
}
