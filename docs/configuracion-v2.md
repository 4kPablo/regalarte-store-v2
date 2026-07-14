# Configuración de la v2

## 1. Variables locales

Copiá `.env.example` como `.env` y completá los valores. Nunca subas `.env`, `.dev.vars`, la cuenta de servicio, el secreto de Cloudinary ni el Deploy Hook al repositorio.

Hay dos grupos distintos:

- `PUBLIC_FIREBASE_*`: configuración pública de la app web de Firebase. Astro la incluye únicamente en el JavaScript de `/admin`.
- El resto: credenciales privadas para scripts, el build o Pages Functions. No deben empezar con `PUBLIC_`.

Para el build puede usarse `FIREBASE_SERVICE_ACCOUNT_JSON` o las tres variables separadas `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`. No configures ambas alternativas a la vez.

## 2. Firebase

1. Creá o elegí un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. En **Authentication → Sign-in method**, habilitá solamente **Correo electrónico/Contraseña**.
3. En **Authentication → Users**, creá manualmente cada cuenta autorizada. El panel no ofrece registro.
4. Creá Firestore en modo producción.
5. En la configuración del proyecto, agregá una aplicación web y copiá sus valores a `PUBLIC_FIREBASE_*`. Usá la misma API key como `FIREBASE_WEB_API_KEY` para las Pages Functions.
6. En **Configuración del proyecto → Cuentas de servicio**, generá una clave privada. Cargá sus datos en las variables privadas del build.
7. Publicá las reglas incluidas:

   ```sh
   pnpm dlx firebase-tools login
   pnpm dlx firebase-tools use TU_PROJECT_ID
   pnpm dlx firebase-tools deploy --only firestore:rules
   ```

8. Con las credenciales privadas presentes en `.env`, autorizá cada cuenta creada:

   ```sh
   pnpm admin:grant -- correo@ejemplo.com
   ```

   Si la persona ya estaba conectada, debe cerrar sesión y volver a ingresar para recibir el claim `admin: true`.

Las reglas niegan toda lectura o escritura desde el navegador a cuentas no administrativas. El build usa el SDK de servidor y se autentica con IAM, por lo que no depende de esas reglas.

## 3. Cloudinary

1. Creá o elegí un entorno en [Cloudinary Console](https://console.cloudinary.com/).
2. Copiá `cloud name`, `API key` y `API secret`.
3. Definí `CLOUDINARY_FOLDER`, por ejemplo `regalarte/catalog`.
4. Guardá `CLOUDINARY_API_SECRET` como secreto cifrado en Cloudflare. No hace falta crear un preset de subida sin firma.

El panel pide a `/api/images/sign` una firma válida por tiempo limitado y después sube el archivo directamente a Cloudinary. Al reemplazar o eliminar una foto, `/api/images/delete` ejecuta el borrado sin exponer el secreto.

## 4. Cloudflare Pages

Para comparar con Sanity sin afectar producción, lo más seguro es conectar una rama `v2-firebase` a un segundo proyecto de Pages o usar un dominio de preview.

Configuración del proyecto:

- Framework preset: **Astro**.
- Build command: `pnpm build`.
- Build output directory: `dist`.
- Root directory: la raíz de este repositorio.

En **Settings → Variables and Secrets**, cargá para producción y previews:

### Disponibles durante el build

- Todos los `PUBLIC_FIREBASE_*`.
- `FIREBASE_PROJECT_ID`.
- `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`, o `FIREBASE_SERVICE_ACCOUNT_JSON`.

### Disponibles para Pages Functions

- `FIREBASE_WEB_API_KEY`.
- `FIREBASE_PROJECT_ID`.
- `CLOUDINARY_CLOUD_NAME`.
- `CLOUDINARY_API_KEY`.
- `CLOUDINARY_API_SECRET` como secreto cifrado.
- `CLOUDINARY_FOLDER`.
- `CLOUDFLARE_DEPLOY_HOOK_URL` como secreto cifrado.

Después, en **Settings → Builds → Deploy hooks**, creá un hook para la rama v2 y guardá su URL en `CLOUDFLARE_DEPLOY_HOOK_URL`. Esa URL inicia builds sin otra autenticación, por eso nunca debe llegar al navegador ni al repositorio.

Cloudflare detecta automáticamente la carpeta `functions/` y publica estas rutas junto con los archivos estáticos:

- `POST /api/images/sign`
- `POST /api/images/delete`
- `POST /api/publish`

Las tres verifican el ID token de Firebase y el claim administrativo.

## 5. Migrar desde Sanity

La migración conserva Sanity intacto. Copia las imágenes a Cloudinary y crea documentos equivalentes en Firestore usando identificadores deterministas, por lo que puede repetirse si una ejecución se interrumpe.

1. Completá en `.env` las credenciales de Firebase Admin, Cloudinary y:

   ```env
   SANITY_PROJECT_ID="..."
   SANITY_DATASET="production"
   SANITY_API_VERSION="2026-03-01"
   SANITY_READ_TOKEN="..."
   ```

   Si el dataset es público, el token puede quedar vacío. También se acepta temporalmente el antiguo `SANITY_WRITE_TOKEN`.

2. Ejecutá la simulación, que solo informa cantidades:

   ```sh
   pnpm migrate:sanity
   ```

3. Si las cantidades son correctas, aplicá la migración:

   ```sh
   pnpm migrate:sanity -- --apply
   ```

4. Entrá en `/admin`, revisá categorías, precios, configuración y fotos. Recién entonces pulsá **Publicar catálogo**.

La migración actualiza documentos con el mismo ID, pero no elimina de Firebase elementos que ya no estén en Sanity. Esa decisión evita pérdidas si se repite durante la comparación.

## 6. Flujo diario de publicación

1. Guardar desde el panel actualiza Firestore e incrementa la revisión del contenido.
2. El catálogo público no cambia todavía y el panel muestra **Cambios sin publicar**.
3. **Publicar catálogo** llama a una Pages Function autenticada.
4. La función protege y ejecuta el Deploy Hook.
5. El build privado lee Firestore y Astro genera el HTML estático nuevo.
6. Cloudflare reemplaza el deploy activo solo cuando el build termina correctamente.

El MVP marca que la solicitud de publicación fue enviada. No consulta la API de despliegues de Cloudflare ni necesita un token adicional de cuenta.

## 7. Desarrollo local

`pnpm dev` permite probar el login, Firestore y la interfaz. Las rutas de Pages Functions no existen dentro del servidor de Astro, así que subir imágenes y publicar requieren el entorno de Pages.

Para probar el flujo completo localmente:

1. Ejecutá `pnpm build` con `.env` configurado.
2. Copiá las variables privadas de Functions a `.dev.vars`.
3. Ejecutá:

   ```sh
   pnpm dlx wrangler pages dev dist
   ```

`.dev.vars` ya está ignorado por Git.

## 8. Retirar Sanity después de validar

No elimines nada de esta lista durante la comparación. Cuando la v2 esté aprobada, pueden borrarse:

- `sanity.config.ts`
- `sanity.cli.ts`
- `src/sanity/` completo
- `src/types/sanity.ts`
- `scripts/seed.ts`
- `scripts/migrate-sanity-to-firebase.ts` cuando ya no se necesiten nuevas migraciones
- la entrada `seed` de `package.json`
- `cdn.sanity.io` de `image.remotePatterns` en `astro.config.mjs`

Dependencias eliminables:

- `@sanity/astro`
- `@sanity/client` después de retirar el script de migración
- `@sanity/image-url`
- `@sanity/vision`
- `sanity`

Después de quitarlas, ejecutá `pnpm install`, `pnpm astro check` y `pnpm build`. Conservá un tag o una rama con la última versión Sanity antes de hacer la limpieza.
