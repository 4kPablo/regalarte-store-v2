import { onRequestPost as __api_images_delete_ts_onRequestPost } from "/home/pavlo/Proyectos/regalarte-store-v2/regalarte-store-main/functions/api/images/delete.ts"
import { onRequestPost as __api_images_sign_ts_onRequestPost } from "/home/pavlo/Proyectos/regalarte-store-v2/regalarte-store-main/functions/api/images/sign.ts"
import { onRequestPost as __api_publish_ts_onRequestPost } from "/home/pavlo/Proyectos/regalarte-store-v2/regalarte-store-main/functions/api/publish.ts"

export const routes = [
    {
      routePath: "/api/images/delete",
      mountPath: "/api/images",
      method: "POST",
      middlewares: [],
      modules: [__api_images_delete_ts_onRequestPost],
    },
  {
      routePath: "/api/images/sign",
      mountPath: "/api/images",
      method: "POST",
      middlewares: [],
      modules: [__api_images_sign_ts_onRequestPost],
    },
  {
      routePath: "/api/publish",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_publish_ts_onRequestPost],
    },
  ]