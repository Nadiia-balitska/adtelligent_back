import Parser from "rss-parser";
import retry from "async-retry";

const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      "enclosure",
      "contentSnippet",
      "summary",
    ],
  },
});

export type FeedItem = {
  id: string;
  title: string;
  link: string;
  content?: string;        
  pubDate?: string;
  image?: string | null;  
};

export type ParsedFeed = {
  url: string;
  title?: string;
  items: FeedItem[];
  fetchedAt: Date;
};

function firstImgFromHtml(html?: string): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

export async function parseFeed(url: string): Promise<ParsedFeed> {
  const feed = await retry(
    async () => parser.parseURL(url),
    { retries: 3, minTimeout: 500, factor: 2 }
  );

  const items: FeedItem[] = (feed.items ?? []).map((i: any, idx: number) => {
    const id = i.guid || i.link || `item-${idx}`;
    const contentHtml =
      i.contentEncoded || i.content || i.summary || i.contentSnippet || "";

    let image: string | null = null;
    if (i.enclosure?.url && (!i.enclosure.type || String(i.enclosure.type).startsWith("image/"))) {
      image = i.enclosure.url;
    }
    if (!image && Array.isArray(i.mediaContent)) {
      image = i.mediaContent.find((m: any) => m?.$?.url)?.$?.url || null;
    }
    if (!image && Array.isArray(i.mediaThumbnail)) {
      image = i.mediaThumbnail.find((m: any) => m?.$?.url)?.$?.url || null;
    }
    if (!image) image = firstImgFromHtml(contentHtml);

    return {
      id: String(id),
      title: i.title || "Без назви",
      link: i.link || "",
      content: String(contentHtml || ""),
      pubDate: i.isoDate || i.pubDate,
      image,
    };
  });

  return {
    url,
    title: feed.title,
    items,
    fetchedAt: new Date(),
  };
}
