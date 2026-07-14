import { createClient, type SanityClient } from "@sanity/client";

const projectId = process.env.SANITY_PROJECT_ID || "";
const dataset = process.env.SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2026-03-01";
const token = process.env.SANITY_WRITE_TOKEN || "";

if (!projectId || projectId === "your-project-id") {
  console.error("✖ Set SANITY_PROJECT_ID in .env before running this script.");
  process.exit(1);
}
if (!token) {
  console.error("✖ Set SANITY_WRITE_TOKEN in .env (create one at sanity.io/manage → API → Tokens, Editor permission).");
  process.exit(1);
}

const client: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

type SeedCategory = {
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number;
};

type SeedProduct = {
  name: string;
  categorySlug: string;
  imageUrl: string;
  featured: boolean;
  inStock: boolean;
};

const CATEGORIES: SeedCategory[] = [
  { name: "Escarapela Clásica", slug: "escarapela-clasica", basePrice: 1000 },
  { name: "Escarapela Glitter", slug: "escarapela-glitter", basePrice: 1500 },
  { name: "Llaveros", slug: "llaveros", basePrice: 800, salePrice: 600 },
];

const PRODUCTS: SeedProduct[] = [
  { name: "Escarapela Celeste y Blanca",    categorySlug: "escarapela-clasica", featured: true,  inStock: true, imageUrl: "https://images.pexels.com/photos/1413420/pexels-photo-1413420.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Tradicional",         categorySlug: "escarapela-clasica", featured: true,  inStock: true, imageUrl: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Intenso",             categorySlug: "escarapela-clasica", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1616096/pexels-photo-1616096.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Argentina",           categorySlug: "escarapela-clasica", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1413420/pexels-photo-1413420.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Patriota",            categorySlug: "escarapela-clasica", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Elegante",            categorySlug: "escarapela-clasica", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1616096/pexels-photo-1616096.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Brillante",           categorySlug: "escarapela-glitter", featured: true,  inStock: true, imageUrl: "https://images.pexels.com/photos/1458867/pexels-photo-1458867.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Glamour",             categorySlug: "escarapela-glitter", featured: true,  inStock: true, imageUrl: "https://images.pexels.com/photos/2735970/pexels-photo-2735970.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Glitter Dorada",      categorySlug: "escarapela-glitter", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/3997388/pexels-photo-3997388.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Glitter Plateada",    categorySlug: "escarapela-glitter", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/3997386/pexels-photo-3997386.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Glitter Rosa",        categorySlug: "escarapela-glitter", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/4046316/pexels-photo-4046316.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Glitter Azul",        categorySlug: "escarapela-glitter", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/3997388/pexels-photo-3997388.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Mini Glitter",        categorySlug: "escarapela-glitter", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/3997386/pexels-photo-3997386.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Llavero Escarapela Clásica",     categorySlug: "llaveros", featured: true,  inStock: true, imageUrl: "https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Llavero Escarapela Glitter",     categorySlug: "llaveros", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1036808/pexels-photo-1036808.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Llavero Celeste",                categorySlug: "llaveros", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1755385/pexels-photo-1755385.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Llavero Dorado",                 categorySlug: "llaveros", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Llavero Blanco y Celeste",       categorySlug: "llaveros", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Llavero Brillante",              categorySlug: "llaveros", featured: false, inStock: true, imageUrl: "https://images.pexels.com/photos/1036808/pexels-photo-1036808.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { name: "Escarapela Satinada",            categorySlug: "escarapela-clasica", featured: false, inStock: false, imageUrl: "https://images.pexels.com/photos/1413420/pexels-photo-1413420.jpeg?auto=compress&cs=tinysrgb&w=800" },
];

async function uploadImageFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const asset = await client.assets.upload("image", buffer, {
    filename,
    contentType: "image/jpeg",
  });
  return asset._id;
}

async function upsertSiteSettings() {
  const id = "siteSettings";
  await client.createOrReplace({
    _id: id,
    _type: "siteSettings",
    siteName: "Regal@arte",
    heroTagline: "✨ Escarapelas artesanales hechas con amor",
    saleMode: false,
  });
  console.log("✓ siteSettings");
}

async function upsertCategories(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const id = `category-${cat.slug}`;
    await client.createOrReplace({
      _id: id,
      _type: "category",
      name: cat.name,
      slug: { _type: "slug", current: cat.slug },
      basePrice: cat.basePrice,
      salePrice: cat.salePrice,
    });
    map[cat.slug] = id;
    console.log(`✓ category: ${cat.name} ($${cat.basePrice})`);
  }
  return map;
}

async function upsertProducts(catIdBySlug: Record<string, string>) {
  for (const [i, p] of PRODUCTS.entries()) {
    const catId = catIdBySlug[p.categorySlug];
    if (!catId) throw new Error(`Missing category ${p.categorySlug}`);
    process.stdout.write(`↑ uploading image for "${p.name}"… `);
    const assetId = await uploadImageFromUrl(p.imageUrl);
    const id = `product-${p.categorySlug}-${i + 1}`;
    await client.createOrReplace({
      _id: id,
      _type: "product",
      name: p.name,
      category: { _type: "reference", _ref: catId },
      image: { _type: "image", asset: { _type: "reference", _ref: assetId } },
      featured: p.featured,
      inStock: p.inStock,
    });
    console.log("✓");
  }
}

async function main() {
  console.log(`\n→ Seeding "${dataset}" on project ${projectId}\n`);
  await upsertSiteSettings();
  const cats = await upsertCategories();
  await upsertProducts(cats);
  console.log("\n✔ Done. Run `pnpm dev` and visit /admin to edit.\n");
}

main().catch((err) => {
  console.error("✖ Seed failed:", err);
  process.exit(1);
});
