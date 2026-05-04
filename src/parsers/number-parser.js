export function parseNumber(value) {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();
  if (trimmed === '') return null;

  const normalized = trimmed.replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export default { parseNumber };
