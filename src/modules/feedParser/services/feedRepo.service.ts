import type { Prisma, PrismaClient } from "@prisma/client";
import type { ParsedFeed } from "./parseFeed.service";

export type FeedDoc = ParsedFeed & { id?: string };

export function createFeedRepo(prisma: PrismaClient) {
  async function findByUrl(url: string): Promise<FeedDoc | null> {
    const doc = await prisma.feed.findUnique({ where: { url } });
    return (doc as unknown as FeedDoc) ?? null;
  }

  async function upsert(feed: ParsedFeed): Promise<void> {
    const data: {
      url: string;
      title: string | null;
      items: Prisma.InputJsonValue;
      fetchedAt: Date;
    } = {
      url: feed.url,
      title: feed.title ?? null,
      items: feed.items as Prisma.InputJsonValue,
      fetchedAt: feed.fetchedAt ? new Date(feed.fetchedAt) : new Date(),
    };

    await prisma.feed.upsert({
      where: { url: data.url },
      update: {
        title: data.title,
        items: data.items,
        fetchedAt: data.fetchedAt,
      },
      create: data,
    });
  }

  return { findByUrl, upsert };
}
