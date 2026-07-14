# Regal@arte v2 experimental

Catálogo estático en Astro con un panel administrativo propio en `/admin`. Esta versión reemplaza el uso activo de Sanity por Firebase Authentication, Firestore y Cloudinary, pero conserva los archivos anteriores para poder comparar o volver atrás durante la prueba.

## Arquitectura

- El catálogo público se genera como HTML estático durante `pnpm build`.
- Solo el build privado lee Firestore mediante `firebase-admin`; la página pública no carga Firebase ni consulta datos antes de mostrarse.
- El panel es una isla React que usa Firebase Authentication y Firestore.
- Las reglas de Firestore requieren el claim `admin: true`. No existe registro público.
- Pages Functions verifica la sesión antes de firmar operaciones de Cloudinary o iniciar una publicación.
- `Publicar catálogo` llama a un Deploy Hook privado. Cloudflare reconstruye la web y mantiene el deploy anterior activo hasta completar el nuevo.

La guía completa de alta y despliegue está en [`docs/configuracion-v2.md`](docs/configuracion-v2.md).

## Comandos

```sh
pnpm install
pnpm dev
pnpm astro check
pnpm build
```

Administración y migración:

```sh
pnpm admin:grant -- correo@ejemplo.com
pnpm migrate:sanity
pnpm migrate:sanity -- --apply
```

La primera migración se ejecuta en modo simulación. Solo `--apply` escribe en Firestore y copia imágenes a Cloudinary.

## Estructura v2

```text
functions/                 Pages Functions: publicación e imágenes firmadas
scripts/                   autorización de usuarios y migración desde Sanity
src/admin/                 panel React y acceso a Firebase desde el panel
src/catalog/               carga privada del build, imágenes y precios
src/pages/admin/           entrada estática de /admin
src/types/catalog.ts       modelo de datos v2
firestore.rules            acceso exclusivo para administradores
.env.example               variables requeridas sin valores sensibles
```

Los componentes públicos Astro y su diseño se mantienen. La carpeta `src/sanity`, `sanity.config.ts`, `sanity.cli.ts` y `scripts/seed.ts` quedan como respaldo temporal y ya no participan del build v2.
