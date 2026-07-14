export const SITE_SETTINGS_QUERY = `
  *[_type == "siteSettings"][0] {
    siteName,
    heroTagline,
    saleMode,
    whatsappNumber,
    instagramHandle
  }
`;

export const CATEGORIES_QUERY = `
  *[_type == "category"] | order(name asc) {
    _id,
    name,
    basePrice,
    salePrice
  }
`;

export const PRODUCTS_QUERY = `
  *[_type == "product"] | order(_createdAt desc) {
    _id,
    name,
    featured,
    inStock,
    overridePrice,
    saleOverridePrice,
    "category": category->{
      _id,
      name,
      basePrice,
      salePrice
    },
    "image": image {
      _id,
      "url": asset->url,
      "metadata": asset->metadata { lqip, dimensions }
    }
  }
`;
