export function adTypeFilter(items, adType) {
  if (!adType) return items;
  return items.filter(i => i.adType.toUpperCase() === adType.toUpperCase());
}