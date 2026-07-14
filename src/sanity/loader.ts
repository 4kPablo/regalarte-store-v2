import { isSanityConfigured, sanityClient } from "./client";
import {
  CATEGORIES_QUERY,
  PRODUCTS_QUERY,
  SITE_SETTINGS_QUERY,
} from "./queries";
import { withPricing } from "./lib/pricing";
import type { Category, Product, SiteSettings } from "../types/sanity";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export type PageData = {
  products: ReturnType<typeof withPricing>[];
  categories: Pick<Category, "_id" | "name" | "slug">[];
  settings: SiteSettings;
  isSanityConfigured: boolean;
  sanityError: string | null;
};

const fallbackSettings: SiteSettings = {
  siteName: "Regal@arte",
  heroTagline: "✨ Escarapelas artesanales hechas con amor",
  saleMode: false,
};

export async function loadHomeData(): Promise<PageData> {
  if (!isSanityConfigured) {
    return {
      products: [],
      categories: [],
      settings: fallbackSettings,
      isSanityConfigured: false,
      sanityError:
        "Sanity no está configurado. Copiá .env.example a .env, completá SANITY_PROJECT_ID y corré pnpm run seed.",
    };
  }

  try {
    const [rawProducts, categories, rawSettings] = await Promise.all([
      sanityClient.fetch<Product[]>(PRODUCTS_QUERY),
      sanityClient.fetch<Category[]>(CATEGORIES_QUERY),
      sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS_QUERY),
    ]);

    const settings: SiteSettings = rawSettings ?? fallbackSettings;
    const categoriesWithSlug = categories.map((c) => ({
      _id: c._id,
      name: c.name,
      slug: slugify(c.name),
      basePrice: c.basePrice,
      salePrice: c.salePrice,
    }));
    const slugById = new Map(
      categoriesWithSlug.map((category) => [category._id, category.slug]),
    );
    const products = rawProducts.map((p) =>
      withPricing(
        {
          ...p,
          category: {
            ...p.category,
            slug: slugById.get(p.category._id) ?? slugify(p.category.name),
          },
        },
        settings,
      ),
    );
    return {
      products,
      categories: categoriesWithSlug,
      settings,
      isSanityConfigured: true,
      sanityError: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Sanity fetch failed:", message);
    return {
      products: [],
      categories: [],
      settings: fallbackSettings,
      isSanityConfigured: true,
      sanityError: message,
    };
  }
}
