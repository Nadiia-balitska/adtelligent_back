export function geoFilter(lineItems, { geo }) {
  if (!geo) return lineItems;

  const normalizedGeo = String(geo).toUpperCase();

  return lineItems.filter(lineItem =>
    String(lineItem.geo || "")
      .split(",")
      .map(country => country.trim().toUpperCase())
      .includes(normalizedGeo)
  );
}
