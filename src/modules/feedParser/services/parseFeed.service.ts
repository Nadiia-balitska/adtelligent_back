import Parser from "rss-parser";
import retry from "async-retry";

const parser = new Parser();

export type FeedItem = {
  id: string;
  title: string;
  link: string;
  content?: string;
  pubDate?: string;
};

export type ParsedFeed = {
  url: string;
  title?: string;
  items: FeedItem[];
  fetchedAt: Date;
};


export async function parseFeed(url: string): Promise<ParsedFeed> {
  const feed = await retry(
    async () => parser.parseURL(url),
    { retries: 3, minTimeout: 500, factor: 2 }
  );

  const items: FeedItem[] = (feed.items ?? []).map((i, idx) => ({
    id: (i.guid as string) || i.link || `item-${idx}`,
    title: i.title || "Без назви",
    link: i.link || "",
    content: (i as any).contentSnippet || (i as any).content || "",
    pubDate: i.isoDate || i.pubDate,
  }));

  return {
    url,
    title: feed.title,
    items,
    fetchedAt: new Date(),
  };
}
