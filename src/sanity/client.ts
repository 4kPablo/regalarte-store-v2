import { createClient, type SanityClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";

const projectId = import.meta.env.SANITY_PROJECT_ID || "your-project-id";
const dataset = import.meta.env.SANITY_DATASET || "production";
const apiVersion = import.meta.env.SANITY_API_VERSION || "2026-03-01";

export const isSanityConfigured =
  !!projectId && projectId !== "your-project-id";

export const sanityClient: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
});

const builder = createImageUrlBuilder({ projectId, dataset });

export function urlFor(source: unknown) {
  return builder.image(source as never);
}

export function productImageUrl(
  image: { _id?: string; url?: string } | null | undefined,
  opts: { width?: number; height?: number; quality?: number } = {},
): string {
  if (!image) return "";
  if (image._id) {
    let b = urlFor(image._id);
    if (opts.width) b = b.width(opts.width);
    if (opts.height) b = b.height(opts.height);
    b = b.auto("format").fit("max");
    if (opts.quality) b = b.quality(opts.quality);
    return b.url();
  }
  if (!image.url) return "";
  const url = new URL(image.url);
  if (opts.width) url.searchParams.set("w", String(opts.width));
  if (opts.height) url.searchParams.set("h", String(opts.height));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  if (opts.quality) url.searchParams.set("q", String(opts.quality));
  return url.toString();
}
