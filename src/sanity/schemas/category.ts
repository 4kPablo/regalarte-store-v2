import { defineField, defineType } from "sanity";

export const category = defineType({
  name: "category",
  title: "Categoría",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nombre",
      type: "string",
      validation: (r) => r.required().max(40),
    }),
    defineField({
      name: "basePrice",
      title: "Precio base (ARS)",
      description:
        "Precio habitual para todos los productos de esta categoría. Cambiá este número y se actualiza todo.",
      type: "number",
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: "salePrice",
      title: "Precio oferta (ARS)",
      description:
        "Precio especial en modo ofertas. Opcional: si queda vacío, se usa el precio base.",
      type: "number",
      validation: (r) => r.min(0),
    }),
  ],
  orderings: [
    {
      title: "Orden manual",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "name", subtitle: "basePrice" },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle ? `$${subtitle} ARS` : undefined,
    }),
  },
});
