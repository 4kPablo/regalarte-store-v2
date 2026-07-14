import type {
  Product,
  ProductWithPricing,
  SiteSettings,
} from "../types/catalog";

function resolvePrice(
  product: Product,
  sale: boolean,
): { display: number; regular: number; isOnSale: boolean } {
  const regular = product.overridePrice ?? product.category.basePrice;
  if (!sale) return { display: regular, regular, isOnSale: false };

  const display = [
    product.saleOverridePrice,
    product.category.salePrice,
    product.overridePrice,
    product.category.basePrice,
  ].find((value): value is number => typeof value === "number");

  return {
    display: display ?? regular,
    regular,
    isOnSale: typeof display === "number" && display < regular,
  };
}

export function withPricing(
  product: Product,
  settings: Pick<SiteSettings, "saleMode">,
): ProductWithPricing {
  const price = resolvePrice(product, settings.saleMode);
  return {
    ...product,
    displayPrice: price.display,
    regularPrice: price.regular,
    isOnSale: price.isOnSale,
    isSaleMode: settings.saleMode,
  };
}

export function formatARS(value: number): string {
  return value.toLocaleString("es-AR");
}
