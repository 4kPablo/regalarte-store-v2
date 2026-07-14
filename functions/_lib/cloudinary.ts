function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function cloudinarySignature(
  parameters: Record<string, string | number>,
  secret: string,
): Promise<string> {
  const serialized = Object.entries(parameters)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const bytes = new TextEncoder().encode(`${serialized}${secret}`);
  return toHex(await crypto.subtle.digest("SHA-1", bytes));
}
