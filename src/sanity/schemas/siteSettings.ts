import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Configuración del sitio",
  type: "document",
  fields: [
    defineField({
      name: "siteName",
      title: "Nombre del sitio",
      type: "string",
      initialValue: "Regal@arte",
    }),
    defineField({
      name: "heroTagline",
      title: "Tagline del header",
      type: "string",
      initialValue: "✨ Escarapelas artesanales hechas con amor",
    }),
    defineField({
      name: "saleMode",
      title: "Modo ofertas activo",
      description:
        "Cuando está prendido, los productos muestran el precio especial (configurado por categoría o por producto).",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "whatsappNumber",
      title: "WhatsApp",
      description: "Formato: 5491112345678 (con código de país, sin +).",
      type: "string",
    }),
    defineField({
      name: "instagramHandle",
      title: "Instagram",
      description: "Sin @. Ejemplo: regalarteescarapelas",
      type: "string",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Configuración del sitio" }),
  },
});
