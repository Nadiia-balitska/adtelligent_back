export type FeedsConfig = {
  list: string[];
  cron: string;
};

function splitList(src?: string): string[] {
  return (src || '')
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function getFeedsConfig(env: Record<string, any> = process.env): FeedsConfig {
  return {
    list: splitList(env.FEEDS_LIST),        
    cron: env.FEEDS_CRON || '*/15 * * * *', 
  };
}
