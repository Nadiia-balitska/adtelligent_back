import { parseFeed } from "./parseFeed.service";
import type { GetFeedReply } from "../schemas/getFeedData.schema";
import type { FeedDoc } from "./feedRepo.service";

export type FeedRepo = {
  findByUrl: (url: string) => Promise<FeedDoc | null>;
  upsert: (feed: FeedDoc) => Promise<void>;
};

function toReply(src: any): GetFeedReply {
  return {
    url: String(src.url),
    title: src.title ?? null,
    fetchedAt:
      typeof src.fetchedAt === "string"
        ? src.fetchedAt
        : new Date(src.fetchedAt ?? Date.now()).toISOString(),
    items: (src.items ?? []).map((i: any) => ({
      id: String(i.id ?? i.guid ?? i.link),
      title: String(i.title ?? ""),
      link: String(i.link ?? ""),
      content: i.content ?? i.contentSnippet ?? null,
      pubDate: i.pubDate ? new Date(i.pubDate).toISOString() : null,
    })),
  };
}

export function createFeedService(repo: FeedRepo) {
  async function getFeed(feedUrl: string, isForce: boolean): Promise<GetFeedReply> {
    if (isForce) {
      const parsed = await parseFeed(feedUrl);
      try { await repo.upsert(parsed); } catch {}
      return toReply(parsed);
    }

    let cached: FeedDoc | null = null;
    try { cached = await repo.findByUrl(feedUrl); } catch {}

    if (cached) return toReply(cached);

    const parsed = await parseFeed(feedUrl);
    try { await repo.upsert(parsed); } catch {}
    return toReply(parsed);
  }
  return { getFeed };
}
