export function normalizeLocationName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function locationNameKey(name: string) {
  return normalizeLocationName(name).toLowerCase();
}

// Capitalize word starts without damaging names such as RGI Airport or ECIL.
export function formatLocationName(name: string) {
  return normalizeLocationName(name).replace(
    /(^|[\s-])(\p{L})/gu,
    (_, prefix, letter) => prefix + letter.toUpperCase(),
  );
}

export const locationOrderBy = [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }] as const;
