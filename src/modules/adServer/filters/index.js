import { geoFilter } from "./geo.filter.js";
import { sizeFilter } from "./size.filter.js";
import { adTypeFilter } from "./adType.filter.js";
import { cpmFilter } from "./cpm.filter.js";
import { frequencyFilter } from "./frequency.filter.js";

const pipeline = [geoFilter, sizeFilter, adTypeFilter, cpmFilter, frequencyFilter];

export async function runFilters(items, ctx) {
  let acc = items;
  for (const filter of pipeline) {
    const out = filter.length === 2 ? filter(acc, ctx) : filter(acc, ctx); 
    acc = out instanceof Promise ? await out : out;
    if (acc.length === 0) break;
  }
  return acc;
}
