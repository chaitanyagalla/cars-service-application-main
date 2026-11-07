export function carSlugFromName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

export function suggestCarSlug(slug: string, usedSlugs: Iterable<string>) {
  const used = new Set(usedSlugs);
  let candidate = slug;
  for (let suffix = 2; used.has(candidate); suffix++) candidate = `${slug}-${suffix}`;
  return candidate;
}
