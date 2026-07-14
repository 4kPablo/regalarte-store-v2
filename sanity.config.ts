import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemas";
import { studioLocales } from "./src/sanity/i18n/es";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || "your-project-id";
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || "production";
const apiVersion =
  import.meta.env.PUBLIC_SANITY_API_VERSION || "2026-03-01";

export default defineConfig({
  name: "regalarte-store",
  title: "Regal@arte — CMS",
  basePath: "/admin",
  projectId,
  dataset,
  apiVersion,
  locale: "es-ES",
  i18n: {
    locales: studioLocales,
    default: "es-ES",
  },
  announcements: { enabled: false },
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
