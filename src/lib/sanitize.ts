/** Sanitización ligera de texto libre antes de persistir */
export function sanitizeText(input: string | null | undefined, maxLen = 200): string | null {
  if (input == null) return null;
  // Quita caracteres de control y recorta
  const clean = String(input).replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!clean) return null;
  return clean.slice(0, maxLen);
}
