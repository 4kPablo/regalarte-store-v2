import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Regal@arte")
    .items([
      S.listItem()
        .title("Configuración del sitio")
        .child(
          S.editor()
            .id("siteSettings")
            .schemaType("siteSettings")
            .documentId("siteSettings"),
        ),
      S.divider(),
      S.documentTypeListItem("category").title("Categorías"),
      S.documentTypeListItem("product").title("Productos"),
    ]);
