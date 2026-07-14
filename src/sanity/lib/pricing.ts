import type { Product, ProductWithPricing, SiteSettings } from "../../types/sanity";

export type PriceSource = "override" | "category";

function resolvePrice(
  product: Product,
  sale: boolean,
): { display: number; regular: number; isOnSale: boolean } {
  const regular = product.overridePrice ?? product.category.basePrice;
  if (!sale) {
    return { display: regular, regular, isOnSale: false };
  }

  const saleChain = [
    product.saleOverridePrice,
    product.category.salePrice,
    product.overridePrice,
    product.category.basePrice,
  ];
  const display = saleChain.find((v): v is number => typeof v === "number");
  const isOnSale = typeof display === "number" && display < regular;
  return { display: display ?? regular, regular, isOnSale };
}

export function withPricing(
  product: Product,
  settings: Pick<SiteSettings, "saleMode">,
): ProductWithPricing {
  const { display, regular, isOnSale } = resolvePrice(
    product,
    settings.saleMode,
  );
  return { ...product, displayPrice: display, regularPrice: regular, isOnSale, isSaleMode: settings.saleMode };
}

export function formatARS(value: number): string {
  return value.toLocaleString("es-AR");
}
