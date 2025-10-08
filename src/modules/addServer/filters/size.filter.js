export function sizeFilter(lineItems, { size }) {
  if (!size) return lineItems;

  return lineItems.filter(lineItem => lineItem.size === String(size));
}
