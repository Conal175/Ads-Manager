export function validProfileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length < 1 || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}
