import type { Prisma, PrismaClient } from "@prisma/client";
import type { ParsedFeed } from "./parseFeed.service";

export type FeedDoc = ParsedFeed & { id?: string };

export function createFeedRepo(prisma: PrismaClient) {
  async function findByUrl(url: string): Promise<FeedDoc | null> {
    const doc = await prisma.feed.findUnique({ where: { url } });
    return (doc as unknown as FeedDoc) ?? null;
  }

 async function upsert(feed: ParsedFeed): Promise<void> {
  const limitedItems = (feed.items ?? []).slice(-20);

  const data: {
    url: string;
    title: string | null;
    items: Prisma.InputJsonValue;
    fetchedAt: Date;
  } = {
    url: feed.url,
    title: feed.title ?? null,
    items: limitedItems as Prisma.InputJsonValue,
    fetchedAt: feed.fetchedAt ? new Date(feed.fetchedAt) : new Date(),
  };

  await prisma.$runCommandRaw({
    update: "Feed",
    updates: [
      {
        q: { url: data.url },
        u: {
          $set: {
            title: data.title,
            items: data.items,
            fetchedAt: data.fetchedAt,
          },
          $setOnInsert: { url: data.url },
        },
        upsert: true,
      },
    ],
  });
}


  return { findByUrl, upsert };
}
