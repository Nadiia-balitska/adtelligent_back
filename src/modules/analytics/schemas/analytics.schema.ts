//  одного івента
export const StatEventSchema = {
  $id: "StatEvent",
  type: "object",
  required: ["event"],
  additionalProperties: false,
  properties: {
    event: { type: "string", minLength: 1 },
    ts: { type: ["number", "string", "null"] },
    timestamp: { type: ["number", "string", "null"] },
    userId: { type: ["string", "null"] },
    page: { type: ["string", "null"] },
    bidder: { type: ["string", "null"] },
    creativeId: { type: ["string", "null"] },
    adUnitCode: { type: ["string", "null"] },
    geo: { type: ["string", "null"] },
    cpm: { type: ["number", "null"] },
  },
};

//  для масиву івентів або одного івента
export const StatEventsBodySchema = {
  oneOf: [
    { $ref: "StatEvent#" },
    {
      type: "array",
      items: { $ref: "StatEvent#" },
    },
  ],
};

//  /stat/report, /stat/export
export const ReportQuerySchema = {
  type: "object",
  properties: {
    date_from: { type: "string" },
    date_to: { type: "string" },
    dimensions: { type: "string", default: "date" },
    fields: {
      type: "string",
      default: "unique_users,auctions,bids,wins,win_rate,avg_cpm",
    },
    event: { type: "string" },
    bidder: { type: "string" },
    creativeId: { type: "string" },
    adUnitCode: { type: "string" },
    geo: { type: "string" },
    cpm_min: { type: "number" },
    cpm_max: { type: "number" },
    page: { type: "integer", minimum: 1, default: 1 },
    page_size: { type: "integer", minimum: 10, maximum: 500, default: 100 },
  },
  additionalProperties: false,
};
