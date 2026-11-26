export type FormState = { error?: string } | undefined;

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Login identifier: e-mail lowercased, phone reduced to digits with a leading +. */
export function normalizeLogin(raw: string): { email?: string; phone?: string } {
  const s = raw.trim();
  if (s.includes("@")) return { email: s.toLowerCase() };
  const digits = s.replace(/\D/g, "");
  if (!digits) return {};
  // Russian numbers: 8XXXXXXXXXX -> 7XXXXXXXXXX
  const d = digits.length === 11 && digits.startsWith("8") ? "7" + digits.slice(1) : digits;
  return { phone: "+" + d };
}
