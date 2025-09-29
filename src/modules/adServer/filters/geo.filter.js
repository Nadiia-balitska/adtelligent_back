export function geoFilter(items, { geo }) {
  if (!geo) return items;
  const G = String(geo).toUpperCase();
  return items.filter(i =>
    String(i.geo || "")
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .includes(G)
  );
}
