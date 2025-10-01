export function cpmFilter(items, cpm) {
  if (!cpm) return items;
  return items.filter(i => cpm >= i.minCPM && cpm <= i.maxCPM);
}