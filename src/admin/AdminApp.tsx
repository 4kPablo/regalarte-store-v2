import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { deleteProductImage, requestCatalogPublication, uploadProductImage } from "./api";
import { firebaseConfigurationError, getFirebaseServices } from "./firebase";
import { slugify } from "../catalog/format";
import type {
  CatalogImage,
  CatalogMeta,
  Category,
  ProductRecord,
  SiteSettings,
} from "../types/catalog";

type Section = "products" | "categories" | "settings";
type Notice = { kind: "success" | "error"; message: string } | null;

const fallbackSettings: SiteSettings = {
  siteName: "Regal@arte",
  heroTagline: "✨ Escarapelas artesanales hechas con amor",
  saleMode: false,
  whatsappNumber: "",
  instagramHandle: "",
};

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("auth/invalid-credential")) {
      return "El correo o la contraseña no son correctos.";
    }
    if (error.message.includes("auth/too-many-requests")) {
      return "Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.";
    }
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}

function asOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function markContentChanged(batch: ReturnType<typeof writeBatch>, database: Firestore) {
  batch.set(
    doc(database, "catalogMeta", "status"),
    {
      contentVersion: increment(1),
      publishStatus: "idle",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function NoticeBanner({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      className={`fixed bottom-5 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${
        notice.kind === "error" ? "bg-red-700 text-white" : "bg-[#2d2a2a] text-white"
      }`}
    >
      <span className="flex-1">{notice.message}</span>
      <button type="button" onClick={onClose} className="rounded px-1 text-white/70 hover:text-white" aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  );
}

function Login({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onNotice(null);
    setLoading(true);
    try {
      const { auth } = getFirebaseServices();
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onNotice(null);
    } catch (error) {
      onNotice({ kind: "error", message: messageFromError(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-[#ead5c0] bg-white p-6 shadow-[0_18px_55px_rgba(45,42,42,0.10)] sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#f3e5d4] text-3xl">✨</div>
          <h1 className="text-2xl font-extrabold">Administrar catálogo</h1>
          <p className="mt-2 text-sm text-[#2d2a2a]/60">Ingresá con la cuenta que te dio Pablolabs.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Correo electrónico">
            <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Contraseña">
            <input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <button className={`${primaryButtonClass} w-full`} type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <a href="/" className="mt-5 block text-center text-sm font-semibold text-[#9584a8] hover:underline">Volver al catálogo</a>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#2d2a2a]/55">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#d8d1ca] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9584a8] focus:ring-4 focus:ring-[#d4c9e0]/35 disabled:bg-zinc-100";
const primaryButtonClass =
  "rounded-xl bg-[#9584a8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#806f94] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55";
const secondaryButtonClass =
  "rounded-xl border border-[#d8d1ca] bg-white px-4 py-2.5 text-sm font-bold transition hover:bg-[#faf8f7] active:scale-[0.98] disabled:opacity-50";

function ProductsPanel({
  user,
  database,
  products,
  categories,
  onNotice,
}: {
  user: User;
  database: Firestore;
  products: ProductRecord[];
  categories: Category[];
  onNotice: (notice: Notice) => void;
}) {
  const [editing, setEditing] = useState<ProductRecord | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const categoryNames = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);

  async function remove(product: ProductRecord) {
    if (!window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`)) return;
    setDeletingId(product.id);
    try {
      const batch = writeBatch(database);
      batch.delete(doc(database, "products", product.id));
      markContentChanged(batch, database);
      await batch.commit();
      if (product.image.publicId) {
        await deleteProductImage(user, product.image.publicId).catch(() => undefined);
      }
      onNotice({ kind: "success", message: "Producto eliminado. Recordá publicar los cambios." });
    } catch (error) {
      onNotice({ kind: "error", message: messageFromError(error) });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <SectionHeading title="Productos" description={`${products.length} productos cargados`} action={
        <button type="button" className={primaryButtonClass} onClick={() => setEditing("new")} disabled={categories.length === 0}>
          + Agregar producto
        </button>
      } />
      {categories.length === 0 && (
        <EmptyState title="Primero creá una categoría" text="Cada producto necesita una categoría para definir su precio." />
      )}
      {categories.length > 0 && products.length === 0 && (
        <EmptyState title="Todavía no hay productos" text="Agregá el primero con el botón de arriba." />
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="flex gap-3 rounded-2xl border border-[#e5ded7] bg-white p-3 shadow-sm">
            <img src={product.image.url} alt="" className="h-24 w-24 shrink-0 rounded-xl bg-[#faf8f7] object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-2 font-bold leading-tight">{product.name}</h3>
                  <p className="mt-1 text-xs text-[#2d2a2a]/55">{categoryNames.get(product.categoryId) ?? "Sin categoría"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${product.inStock ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                  {product.inStock ? "En stock" : "Agotado"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" className="text-sm font-bold text-[#806f94] hover:underline" onClick={() => setEditing(product)}>Editar</button>
                <button type="button" className="text-sm font-bold text-red-700 hover:underline disabled:opacity-50" disabled={deletingId === product.id} onClick={() => void remove(product)}>
                  {deletingId === product.id ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <ProductForm
          current={editing === "new" ? null : editing}
          categories={categories}
          user={user}
          database={database}
          onClose={() => setEditing(null)}
          onNotice={onNotice}
        />
      )}
    </section>
  );
}

function ProductForm({
  current,
  categories,
  user,
  database,
  onClose,
  onNotice,
}: {
  current: ProductRecord | null;
  categories: Category[];
  user: User;
  database: Firestore;
  onClose: () => void;
  onNotice: (notice: Notice) => void;
}) {
  const [name, setName] = useState(current?.name ?? "");
  const [categoryId, setCategoryId] = useState(current?.categoryId ?? categories[0]?.id ?? "");
  const [featured, setFeatured] = useState(current?.featured ?? false);
  const [inStock, setInStock] = useState(current?.inStock ?? true);
  const [overridePrice, setOverridePrice] = useState(current?.overridePrice?.toString() ?? "");
  const [saleOverridePrice, setSaleOverridePrice] = useState(current?.saleOverridePrice?.toString() ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(current?.image.url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current && !file) {
      onNotice({ kind: "error", message: "Elegí una foto para el producto." });
      return;
    }
    if (file && (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      onNotice({ kind: "error", message: "La foto debe ser una imagen de hasta 10 MB." });
      return;
    }

    setSaving(true);
    let uploadedImage: CatalogImage | null = null;
    try {
      if (file) uploadedImage = await uploadProductImage(user, file);
      const image = uploadedImage ?? current?.image;
      if (!image) throw new Error("Falta la foto del producto.");

      const reference = current ? doc(database, "products", current.id) : doc(collection(database, "products"));
      const regular = asOptionalNumber(overridePrice);
      const sale = asOptionalNumber(saleOverridePrice);
      const data = {
        name: name.trim(),
        categoryId,
        featured,
        inStock,
        image,
        ...(regular !== undefined ? { overridePrice: regular } : {}),
        ...(sale !== undefined ? { saleOverridePrice: sale } : {}),
        updatedAt: serverTimestamp(),
        ...(!current ? { createdAt: serverTimestamp() } : {}),
      };

      const batch = writeBatch(database);
      batch.set(reference, data);
      markContentChanged(batch, database);
      await batch.commit();
      if (uploadedImage && current?.image.publicId) {
        await deleteProductImage(user, current.image.publicId).catch(() => undefined);
      }
      onNotice({ kind: "success", message: `Producto ${current ? "actualizado" : "creado"}. Recordá publicar los cambios.` });
      onClose();
    } catch (error) {
      if (uploadedImage?.publicId) await deleteProductImage(user, uploadedImage.publicId).catch(() => undefined);
      onNotice({ kind: "error", message: messageFromError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2d2a2a]/50 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <div className="mx-auto my-4 w-full max-w-2xl rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#9584a8]">Producto</p>
            <h2 id="product-form-title" className="text-2xl font-extrabold">{current ? "Editar producto" : "Nuevo producto"}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#f7f5f2] text-2xl" aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <Field label="Foto" hint="JPG, PNG o WebP. Máximo 10 MB.">
              <label className="mt-1 block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[#d4c9e0] bg-[#faf8f7]">
                {preview ? <img src={preview} alt="Vista previa" className="aspect-square w-full object-cover" /> : <span className="grid aspect-square place-items-center px-4 text-center text-sm font-semibold text-[#2d2a2a]/55">Elegir foto</span>}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
            </Field>
            <div className="space-y-4">
              <Field label="Nombre">
                <input className={inputClass} required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Categoría">
                <select className={inputClass} required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Toggle label="En stock" checked={inStock} onChange={setInStock} />
                <Toggle label="Destacado" checked={featured} onChange={setFeatured} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio diferente (opcional)" hint="Dejalo vacío para usar el precio de la categoría.">
              <input className={inputClass} type="number" inputMode="decimal" min="0" step="0.01" value={overridePrice} onChange={(event) => setOverridePrice(event.target.value)} />
            </Field>
            <Field label="Precio de oferta (opcional)" hint="Solo se usa cuando las ofertas están activadas.">
              <input className={inputClass} type="number" inputMode="decimal" min="0" step="0.01" value={saleOverridePrice} onChange={(event) => setSaleOverridePrice(event.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#eee8e2] pt-5 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? (file ? "Subiendo y guardando…" : "Guardando…") : "Guardar producto"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoriesPanel({ database, categories, products, onNotice }: { database: Firestore; categories: Category[]; products: ProductRecord[]; onNotice: (notice: Notice) => void }) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  async function remove(category: Category) {
    const usedLocally = products.some((product) => product.categoryId === category.id);
    const usedSnapshot = usedLocally
      ? true
      : !(await getDocs(query(collection(database, "products"), where("categoryId", "==", category.id), limit(1)))).empty;
    if (usedSnapshot) {
      onNotice({ kind: "error", message: "No se puede eliminar: todavía hay productos en esta categoría." });
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return;
    try {
      const batch = writeBatch(database);
      batch.delete(doc(database, "categories", category.id));
      markContentChanged(batch, database);
      await batch.commit();
      onNotice({ kind: "success", message: "Categoría eliminada. Recordá publicar los cambios." });
    } catch (error) {
      onNotice({ kind: "error", message: messageFromError(error) });
    }
  }

  return (
    <section>
      <SectionHeading title="Categorías y precios" description="El precio base se aplica a todos los productos de la categoría." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing("new")}>+ Agregar categoría</button>} />
      {categories.length === 0 && <EmptyState title="Todavía no hay categorías" text="Creá una para empezar a cargar productos." />}
      <div className="space-y-3">
        {categories.map((category) => (
          <article key={category.id} className="flex flex-col gap-3 rounded-2xl border border-[#e5ded7] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold">{category.name}</h3>
              <p className="mt-1 text-sm text-[#2d2a2a]/60">Precio habitual: <strong>${category.basePrice.toLocaleString("es-AR")}</strong>{category.salePrice !== undefined && <> · Oferta: <strong>${category.salePrice.toLocaleString("es-AR")}</strong></>}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setEditing(category)}>Editar</button>
              <button type="button" className="rounded-xl px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50" onClick={() => void remove(category)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>
      {editing && <CategoryForm current={editing === "new" ? null : editing} database={database} categories={categories} onClose={() => setEditing(null)} onNotice={onNotice} />}
    </section>
  );
}

function CategoryForm({ current, database, categories, onClose, onNotice }: { current: Category | null; database: Firestore; categories: Category[]; onClose: () => void; onNotice: (notice: Notice) => void }) {
  const [name, setName] = useState(current?.name ?? "");
  const [basePrice, setBasePrice] = useState(current?.basePrice.toString() ?? "");
  const [salePrice, setSalePrice] = useState(current?.salePrice?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (categories.some((category) => category.id !== current?.id && category.name.toLowerCase() === normalizedName.toLowerCase())) {
      onNotice({ kind: "error", message: "Ya existe una categoría con ese nombre." });
      return;
    }
    setSaving(true);
    try {
      const reference = current ? doc(database, "categories", current.id) : doc(collection(database, "categories"));
      const sale = asOptionalNumber(salePrice);
      const batch = writeBatch(database);
      batch.set(reference, {
        name: normalizedName,
        slug: slugify(normalizedName),
        basePrice: Number(basePrice),
        ...(sale !== undefined ? { salePrice: sale } : {}),
        order: current?.order ?? categories.length,
        updatedAt: serverTimestamp(),
      });
      markContentChanged(batch, database);
      await batch.commit();
      onNotice({ kind: "success", message: `Categoría ${current ? "actualizada" : "creada"}. Recordá publicar los cambios.` });
      onClose();
    } catch (error) {
      onNotice({ kind: "error", message: messageFromError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#2d2a2a]/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#9584a8]">Categoría</p><h2 className="text-2xl font-extrabold">{current ? "Editar categoría" : "Nueva categoría"}</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#f7f5f2] text-2xl" aria-label="Cerrar">×</button>
        </div>
        <div className="space-y-4">
          <Field label="Nombre"><input className={inputClass} required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Precio habitual"><input className={inputClass} required type="number" inputMode="decimal" min="0" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} /></Field>
          <Field label="Precio de oferta (opcional)" hint="Se usa únicamente cuando activás las ofertas."><input className={inputClass} type="number" inputMode="decimal" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></Field>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#eee8e2] pt-5 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? "Guardando…" : "Guardar categoría"}</button>
        </div>
      </form>
    </div>
  );
}

function SettingsPanel({ database, settings, onNotice }: { database: Firestore; settings: SiteSettings; onNotice: (notice: Notice) => void }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const batch = writeBatch(database);
      batch.set(doc(database, "settings", "site"), { ...form, whatsappNumber: form.whatsappNumber?.replace(/\D/g, "") ?? "", instagramHandle: form.instagramHandle?.replace(/^@/, "") ?? "", updatedAt: serverTimestamp() });
      markContentChanged(batch, database);
      await batch.commit();
      onNotice({ kind: "success", message: "Datos generales guardados. Recordá publicar los cambios." });
    } catch (error) {
      onNotice({ kind: "error", message: messageFromError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <SectionHeading title="Datos generales" description="Textos y medios de contacto que aparecen en el catálogo." />
      <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl border border-[#e5ded7] bg-white p-5 shadow-sm sm:p-6">
        <Field label="Nombre del catálogo"><input className={inputClass} required maxLength={60} value={form.siteName} onChange={(event) => setForm({ ...form, siteName: event.target.value })} /></Field>
        <Field label="Frase de presentación"><input className={inputClass} required maxLength={120} value={form.heroTagline} onChange={(event) => setForm({ ...form, heroTagline: event.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" hint="Código de país y área, sin + ni espacios."><input className={inputClass} inputMode="tel" placeholder="5491112345678" value={form.whatsappNumber ?? ""} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} /></Field>
          <Field label="Instagram" hint="Podés escribirlo con o sin @."><input className={inputClass} placeholder="regalarteescarapelas" value={form.instagramHandle ?? ""} onChange={(event) => setForm({ ...form, instagramHandle: event.target.value })} /></Field>
        </div>
        <div className="rounded-2xl border border-[#ead5c0] bg-[#faf8f7] p-4"><Toggle label="Mostrar precios de oferta" checked={form.saleMode} onChange={(saleMode) => setForm({ ...form, saleMode })} /><p className="mt-2 text-xs text-[#2d2a2a]/55">Al activarlo se usan los precios de oferta cargados en categorías y productos.</p></div>
        <div className="flex justify-end border-t border-[#eee8e2] pt-5"><button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? "Guardando…" : "Guardar datos"}</button></div>
      </form>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5ded7] bg-white px-3 py-2.5 text-sm font-bold">
      <input type="checkbox" className="h-4 w-4 accent-[#9584a8]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function SectionHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2><p className="mt-1 text-sm text-[#2d2a2a]/55">{description}</p></div>
      {action}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="mb-4 rounded-2xl border-2 border-dashed border-[#d4c9e0] bg-white p-8 text-center"><p className="text-3xl">✨</p><h3 className="mt-2 font-extrabold">{title}</h3><p className="mt-1 text-sm text-[#2d2a2a]/55">{text}</p></div>;
}

function AdminShell({ user, database, onNotice }: { user: User; database: Firestore; onNotice: (notice: Notice) => void }) {
  const [section, setSection] = useState<Section>("products");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);
  const [meta, setMeta] = useState<CatalogMeta>({ contentVersion: 0, lastPublishRequestedVersion: 0 });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let ready = 0;
    const markReady = () => { ready += 1; if (ready >= 4) setLoading(false); };
    const handleSnapshotError = (error: unknown) => {
      setLoading(false);
      onNotice({ kind: "error", message: `No se pudo cargar el catálogo: ${messageFromError(error)}` });
    };
    const unsubscribers = [
      onSnapshot(collection(database, "products"), (snapshot) => {
        setProducts(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ProductRecord, "id">) })).sort((a, b) => a.name.localeCompare(b.name)));
        markReady();
      }, handleSnapshotError),
      onSnapshot(collection(database, "categories"), (snapshot) => {
        setCategories(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Category, "id">) })).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name)));
        markReady();
      }, handleSnapshotError),
      onSnapshot(doc(database, "settings", "site"), (snapshot) => {
        if (snapshot.exists()) setSettings({ ...fallbackSettings, ...(snapshot.data() as SiteSettings) });
        markReady();
      }, handleSnapshotError),
      onSnapshot(doc(database, "catalogMeta", "status"), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<CatalogMeta>;
          setMeta({
            contentVersion: data.contentVersion ?? 0,
            lastPublishRequestedVersion: data.lastPublishRequestedVersion ?? 0,
            ...(data.publishStatus ? { publishStatus: data.publishStatus } : {}),
          });
        }
        markReady();
      }, handleSnapshotError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [database]);

  const hasPendingChanges = meta.contentVersion > meta.lastPublishRequestedVersion;

  async function publish() {
    setPublishing(true);
    try {
      await requestCatalogPublication(user);
      onNotice({ kind: "success", message: "Publicación iniciada. El catálogo se actualizará en 1 o 2 minutos." });
    } catch (error) {
      onNotice({ kind: "error", message: messageFromError(error) });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#e5ded7] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3e5d4] text-xl">✨</div>
          <div className="min-w-0 flex-1"><h1 className="truncate font-extrabold">Regal@arte</h1><p className="hidden text-xs text-[#2d2a2a]/50 sm:block">Administración del catálogo</p></div>
          <div className={`hidden rounded-full px-3 py-1.5 text-xs font-extrabold sm:block ${hasPendingChanges ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>
            {hasPendingChanges ? "Cambios sin publicar" : "Sin cambios nuevos"}
          </div>
          <button type="button" className={primaryButtonClass} disabled={!hasPendingChanges || publishing} onClick={() => void publish()}>
            {publishing ? "Publicando…" : "Publicar catálogo"}
          </button>
          <button type="button" className="rounded-xl px-2 py-2 text-sm font-bold text-[#2d2a2a]/60 hover:bg-[#f7f5f2]" onClick={() => void signOut(getFirebaseServices().auth)} title="Cerrar sesión">Salir</button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[210px_1fr] lg:py-8">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Secciones">
          {([
            ["products", "Productos"],
            ["categories", "Categorías y precios"],
            ["settings", "Datos generales"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSection(id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${section === id ? "bg-[#2d2a2a] text-white" : "bg-white text-[#2d2a2a]/70 hover:bg-[#faf8f7]"}`}>{label}</button>
          ))}
          <a href="/" target="_blank" rel="noreferrer" className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-[#9584a8] hover:bg-white">Ver catálogo ↗</a>
        </nav>
        <main>
          <div className={`mb-5 rounded-2xl px-4 py-3 text-sm sm:hidden ${hasPendingChanges ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}><strong>{hasPendingChanges ? "Tenés cambios sin publicar." : "No hay cambios nuevos."}</strong></div>
          {loading ? <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#2d2a2a]/55">Cargando catálogo…</div> : (
            <>
              {section === "products" && <ProductsPanel user={user} database={database} products={products} categories={categories} onNotice={onNotice} />}
              {section === "categories" && <CategoriesPanel database={database} categories={categories} products={products} onNotice={onNotice} />}
              {section === "settings" && <SettingsPanel database={database} settings={settings} onNotice={onNotice} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (firebaseConfigurationError) {
      setChecking(false);
      return;
    }
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, async (current) => {
      setUser(current);
      if (!current) {
        setAuthorized(null);
        setChecking(false);
        return;
      }
      try {
        const token = await current.getIdTokenResult(true);
        setAuthorized(token.claims.admin === true);
      } catch (error) {
        setNotice({ kind: "error", message: messageFromError(error) });
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    });
  }, []);

  if (checking) return <div className="grid min-h-screen place-items-center text-sm font-semibold text-[#2d2a2a]/55">Comprobando acceso…</div>;
  if (firebaseConfigurationError) return <div className="mx-auto mt-20 max-w-lg rounded-2xl bg-white p-6 text-center shadow"><h1 className="text-xl font-extrabold">Falta configurar el panel</h1><p className="mt-2 text-sm text-[#2d2a2a]/60">{firebaseConfigurationError}</p></div>;
  if (!user) return <><Login onNotice={setNotice} /><NoticeBanner notice={notice} onClose={() => setNotice(null)} /></>;
  if (authorized === false) return <main className="grid min-h-screen place-items-center px-4"><div className="max-w-md rounded-2xl bg-white p-7 text-center shadow"><h1 className="text-xl font-extrabold">Esta cuenta no tiene acceso</h1><p className="mt-2 text-sm text-[#2d2a2a]/60">Pedile a Pablolabs que autorice esta cuenta.</p><button type="button" className={`${secondaryButtonClass} mt-5`} onClick={() => void signOut(getFirebaseServices().auth)}>Usar otra cuenta</button></div></main>;

  const { database } = getFirebaseServices();
  return <><AdminShell user={user} database={database} onNotice={setNotice} /><NoticeBanner notice={notice} onClose={() => setNotice(null)} /></>;
}
