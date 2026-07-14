import { getAuth } from "firebase-admin/auth";
import { firebaseAdminApp } from "./_firebase-admin";

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Uso: pnpm admin:grant -- correo@ejemplo.com");
  process.exit(1);
}

async function main() {
  const auth = getAuth(firebaseAdminApp());
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {
    ...user.customClaims,
    admin: true,
  });
  console.log(`✓ Acceso administrativo habilitado para ${email}.`);
  console.log("  Si la cuenta estaba abierta, debe cerrar sesión y volver a ingresar.");
}

main().catch((error: unknown) => {
  console.error("✖ No se pudo autorizar la cuenta:", error);
  process.exit(1);
});
