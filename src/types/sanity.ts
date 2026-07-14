export type SanityImage = {
  _id: string;
  url: string;
  metadata?: {
    lqip?: string;
    dimensions?: { width: number; height: number; aspectRatio?: number };
  };
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number;
};

export type Product = {
  _id: string;
  name: string;
  featured: boolean;
  inStock: boolean;
  overridePrice?: number;
  saleOverridePrice?: number;
  category: Category;
  image: SanityImage;
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
