export function adTypeFilter(lineItems, { adType }) {
  if (!adType) return lineItems;

  const normalizedAdType = String(adType).toUpperCase();

  return lineItems.filter(lineItem => String(lineItem.adType).toUpperCase() === normalizedAdType);
}
