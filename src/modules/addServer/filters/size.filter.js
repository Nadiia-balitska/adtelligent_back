export function sizeFilter(items, { size }) {
  if (!size) return items;
  return items.filter(i => i.size === String(size));
}
