export function parseProductEdit(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.code !== 'string' || typeof input.name !== 'string' || typeof input.category !== 'string' || typeof input.expectedCode !== 'string') return null;
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const category = input.category.trim();
  const expectedCode = input.expectedCode.trim();
  if (!/^[A-Z0-9-]{1,40}$/.test(code) || !name || name.length > 200 || !category || category.length > 200 || !expectedCode || expectedCode.length > 200) return null;
  return { code, name, category, expectedCode };
}
