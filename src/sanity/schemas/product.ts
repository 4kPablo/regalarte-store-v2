import { defineField, defineType } from "sanity";

export const product = defineType({
  name: "product",
  title: "Producto",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nombre",
      type: "string",
      validation: (r) => r.required().max(80),
    }),
    defineField({
      name: "category",
      title: "Categoría",
      type: "reference",
      to: [{ type: "category" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "image",
      title: "Foto",
      description: "Recomendado: 800x800 o más, formato JPG/PNG/WebP.",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "featured",
      title: "Destacado",
      description: "Aparece en el carrusel de la home.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "inStock",
      title: "En stock",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "overridePrice",
      title: "Precio especial (opcional)",
      description:
        "Si este producto vale distinto al resto de la categoría, ponelo acá. Si queda vacío, usa el precio de la categoría.",
      type: "number",
      validation: (r) => r.min(0),
    }),
    defineField({
      name: "saleOverridePrice",
      title: "Precio oferta especial (opcional)",
      description: "Igual que el anterior, pero activo solo en modo ofertas.",
      type: "number",
      validation: (r) => r.min(0),
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category.name",
      media: "image",
    },
  },
});
