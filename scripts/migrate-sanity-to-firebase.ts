import { createClient } from "@sanity/client";
import { v2 as cloudinary } from "cloudinary";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firebaseAdminDatabase } from "./_firebase-admin";

type SanityCategory = {
  _id: string;
  name: string;
  basePrice: number;
  salePrice?: number;
};

type SanityProduct = {
  _id: string;
  _createdAt: string;
  name: string;
  featured?: boolean;
  inStock?: boolean;
  overridePrice?: number;
  saleOverridePrice?: number;
  categoryId: string;
  imageUrl: string;
};

type SanitySettings = {
  siteName?: string;
  heroTagline?: string;
  saleMode?: boolean;
  whatsappNumber?: string;
  instagramHandle?: string;
};

const applyChanges = process.argv.includes("--apply");
const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2026-03-01";
const token = process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryKey = process.env.CLOUDINARY_API_KEY;
const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "regalarte/catalog";

if (!projectId) throw new Error("Falta SANITY_PROJECT_ID.");
if (applyChanges && (!cloudName || !cloudinaryKey || !cloudinarySecret)) {
  throw new Error("Faltan las variables privadas de Cloudinary.");
}

const sanity = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

function firestoreId(sanityId: string): string {
  return sanityId.replaceAll("/", "_");
}

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

async function readSanity() {
  return Promise.all([
    sanity.fetch<SanityCategory[]>(`*[_type == "category"] | order(name asc) { _id, name, basePrice, salePrice }`),
    sanity.fetch<SanityProduct[]>(`*[_type == "product"] | order(_createdAt asc) {
      _id, _createdAt, name, featured, inStock, overridePrice, saleOverridePrice,
      "categoryId": category->_id,
      "imageUrl": image.asset->url
    }`),
    sanity.fetch<SanitySettings | null>(`*[_type == "siteSettings"][0] {
      siteName, heroTagline, saleMode, whatsappNumber, instagramHandle
    }`),
  ]);
}

async function main() {
  const [categories, products, settings] = await readSanity();
  console.log(`Encontrados: ${categories.length} categorías, ${products.length} productos y ${settings ? "1 configuración" : "ninguna configuración"}.`);
  if (!applyChanges) {
    console.log("Modo simulación: no se modificó Firebase ni Cloudinary.");
    console.log("Revisá los números y ejecutá: pnpm migrate:sanity -- --apply");
    return;
  }

  cloudinary.config({ cloud_name: cloudName, api_key: cloudinaryKey, api_secret: cloudinarySecret, secure: true });
  const database = firebaseAdminDatabase();
  const categoryIds = new Map(categories.map((category) => [category._id, firestoreId(category._id)]));

  const baseBatch = database.batch();
  categories.forEach((category, order) => {
    const reference = database.collection("categories").doc(firestoreId(category._id));
    baseBatch.set(reference, {
      name: category.name,
      slug: slugify(category.name),
      basePrice: category.basePrice,
      ...(typeof category.salePrice === "number" ? { salePrice: category.salePrice } : {}),
      order,
      migratedFromSanityId: category._id,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  if (settings) {
    baseBatch.set(database.collection("settings").doc("site"), {
      siteName: settings.siteName || "Regal@arte",
      heroTagline: settings.heroTagline || "✨ Escarapelas artesanales hechas con amor",
      saleMode: settings.saleMode === true,
      whatsappNumber: settings.whatsappNumber || "",
      instagramHandle: settings.instagramHandle || "",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await baseBatch.commit();

  for (const [index, product] of products.entries()) {
    if (!product.imageUrl) throw new Error(`El producto “${product.name}” no tiene imagen.`);
    process.stdout.write(`[${index + 1}/${products.length}] Subiendo ${product.name}… `);
    const uploaded = await cloudinary.uploader.upload(product.imageUrl, {
      folder: cloudinaryFolder,
      public_id: `sanity-${firestoreId(product._id)}`,
      overwrite: true,
      resource_type: "image",
    });
    const categoryId = categoryIds.get(product.categoryId);
    if (!categoryId) throw new Error(`El producto “${product.name}” no tiene una categoría válida.`);
    await database.collection("products").doc(firestoreId(product._id)).set({
      name: product.name,
      categoryId,
      featured: product.featured === true,
      inStock: product.inStock !== false,
      ...(typeof product.overridePrice === "number" ? { overridePrice: product.overridePrice } : {}),
      ...(typeof product.saleOverridePrice === "number" ? { saleOverridePrice: product.saleOverridePrice } : {}),
      image: { publicId: uploaded.public_id, url: uploaded.secure_url, width: uploaded.width, height: uploaded.height },
      migratedFromSanityId: product._id,
      createdAt: Timestamp.fromDate(new Date(product._createdAt)),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("listo");
  }

  await database.collection("catalogMeta").doc("status").set({
    contentVersion: FieldValue.increment(1),
    lastPublishRequestedVersion: 0,
    publishStatus: "idle",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log("✓ Migración terminada. Revisá el panel antes de publicar.");
}

main().catch((error: unknown) => {
  console.error("✖ La migración se detuvo:", error);
  process.exit(1);
});
