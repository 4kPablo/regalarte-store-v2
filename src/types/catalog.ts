export type CatalogImage = {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number;
  order?: number;
};

export type ProductRecord = {
  id: string;
  name: string;
  categoryId: string;
  featured: boolean;
  inStock: boolean;
  overridePrice?: number;
  saleOverridePrice?: number;
  image: CatalogImage;
};

export type Product = Omit<ProductRecord, "categoryId"> & {
  category: Category;
};

export type SiteSettings = {
  siteName: string;
  heroTagline: string;
  saleMode: boolean;
  whatsappNumber?: string;
  instagramHandle?: string;
};

export type ProductWithPricing = Product & {
  displayPrice: number;
  regularPrice: number;
  isOnSale: boolean;
  isSaleMode: boolean;
};

export type CatalogMeta = {
  contentVersion: number;
  lastPublishRequestedVersion: number;
  publishStatus?: "queued" | "idle";
};
