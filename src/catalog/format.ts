import type { CatalogImage } from "../types/catalog";

type ImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function productImageUrl(
  image: CatalogImage | null | undefined,
  options: ImageOptions = {},
): string {
  if (!image?.url) return "";

  const transformations = [
    "f_auto",
    `q_${options.quality ?? "auto"}`,
    "c_limit",
    options.width ? `w_${options.width}` : "",
    options.height ? `h_${options.height}` : "",
  ].filter(Boolean);

  if (!image.url.includes("/upload/")) return image.url;
  return image.url.replace("/upload/", `/upload/${transformations.join(",")}/`);
}
