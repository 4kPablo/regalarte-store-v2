import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { slugify } from "./format";
import { withPricing } from "./pricing";
import type {
  Category,
  Product,
  ProductRecord,
  SiteSettings,
} from "../types/catalog";

export type PageData = {
  products: ReturnType<typeof withPricing>[];
  categories: Category[];
  settings: SiteSettings;
  isFirebaseConfigured: boolean;
  firebaseError: string | null;
};

const fallbackSettings: SiteSettings = {
  siteName: "Regal@arte",
  heroTagline: "✨ Escarapelas artesanales hechas con amor",
  saleMode: false,
};

function firebaseConfiguration() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = JSON.parse(json) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function firebaseDatabase() {
  const configuration = firebaseConfiguration();
  if (!configuration) return null;

  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(configuration) });
  return getFirestore(app);
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export async function loadHomeData(): Promise<PageData> {
  const database = firebaseDatabase();
  if (!database) {
    return {
      products: [],
      categories: [],
      settings: fallbackSettings,
      isFirebaseConfigured: false,
      firebaseError:
        "Firebase no está configurado para el build. Revisá las variables privadas de Cloudflare Pages.",
    };
  }

  try {
    const [productSnapshot, categorySnapshot, settingsSnapshot] =
      await Promise.all([
        database.collection("products").get(),
        database.collection("categories").get(),
        database.collection("settings").doc("site").get(),
      ]);

    const categories = categorySnapshot.docs
      .map((document): Category => {
        const data = document.data();
        return {
          id: document.id,
          name: String(data.name ?? ""),
          slug: String(data.slug || slugify(String(data.name ?? ""))),
          basePrice: Number(data.basePrice ?? 0),
          ...(numberOrUndefined(data.salePrice) !== undefined
            ? { salePrice: numberOrUndefined(data.salePrice) }
            : {}),
          ...(numberOrUndefined(data.order) !== undefined
            ? { order: numberOrUndefined(data.order) }
            : {}),
        };
      })
      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name));

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const products = productSnapshot.docs
      .sort((left, right) => {
        const leftTime = left.data().createdAt?.toMillis?.() ?? 0;
        const rightTime = right.data().createdAt?.toMillis?.() ?? 0;
        return rightTime - leftTime;
      })
      .map((document): Product | null => {
        const data = document.data() as Omit<ProductRecord, "id">;
        const category = categoryById.get(data.categoryId);
        if (!category || !data.image?.url) return null;
        return {
          id: document.id,
          name: String(data.name ?? ""),
          category,
          featured: data.featured === true,
          inStock: data.inStock !== false,
          image: data.image,
          ...(numberOrUndefined(data.overridePrice) !== undefined
            ? { overridePrice: numberOrUndefined(data.overridePrice) }
            : {}),
          ...(numberOrUndefined(data.saleOverridePrice) !== undefined
            ? { saleOverridePrice: numberOrUndefined(data.saleOverridePrice) }
            : {}),
        };
      })
      .filter((product): product is Product => product !== null)
      .map((product) => withPricing(product, {
        saleMode: settingsSnapshot.data()?.saleMode === true,
      }));

    const settingsData = settingsSnapshot.data();
    const settings: SiteSettings = settingsData
      ? {
          siteName: String(settingsData.siteName || fallbackSettings.siteName),
          heroTagline: String(
            settingsData.heroTagline || fallbackSettings.heroTagline,
          ),
          saleMode: settingsData.saleMode === true,
          ...(settingsData.whatsappNumber
            ? { whatsappNumber: String(settingsData.whatsappNumber) }
            : {}),
          ...(settingsData.instagramHandle
            ? { instagramHandle: String(settingsData.instagramHandle) }
            : {}),
        }
      : fallbackSettings;

    return {
      products,
      categories,
      settings,
      isFirebaseConfigured: true,
      firebaseError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Firebase build fetch failed:", message);
    return {
      products: [],
      categories: [],
      settings: fallbackSettings,
      isFirebaseConfigured: true,
      firebaseError: message,
    };
  }
}
