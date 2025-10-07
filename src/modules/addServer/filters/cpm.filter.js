export function cpmFilter(lineItems, { cpm }) {
  if (typeof cpm !== "number") return lineItems;

  return lineItems.filter(lineItem => 
    cpm >= lineItem.minCPM && cpm <= lineItem.maxCPM
  );
}
  