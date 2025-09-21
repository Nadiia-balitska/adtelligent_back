import type { PrismaClient } from "@prisma/client";
import type { ParsedFeed } from "./parseFeed.service";

export type FeedDoc = ParsedFeed & { id?: any }; 

export function createFeedRepo(prisma: PrismaClient) {
  async function findByUrl(url: string): Promise<FeedDoc | null> {
    const doc = await prisma.feed.findUnique({ where: { url } });
    return (doc as unknown) as FeedDoc | null;
  }

  async function upsert(feed: ParsedFeed): Promise<void> {
    await prisma.feed.upsert({
      where: { url: feed.url },
      update: {
        title: feed.title ?? null,
        items: feed.items as any,  
        fetchedAt: feed.fetchedAt,
      },
      create: {
        url: feed.url,
        title: feed.title ?? null,
        items: feed.items as any,
        fetchedAt: feed.fetchedAt,
      },
    });
  }

  return { findByUrl, upsert };
}
