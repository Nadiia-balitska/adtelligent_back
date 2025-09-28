import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { ParsedFeed } from "./parseFeed.service";

export type FeedDoc = ParsedFeed & { id?: any };

export function createFeedRepo(prisma: PrismaClient) {
  async function findByUrl(url: string): Promise<FeedDoc | null> {
    const doc = await prisma.feed.findUnique({ where: { url } });
    return doc as unknown as FeedDoc | null;
  }

  
  async function upsert(feed: ParsedFeed): Promise<void> {
    const { url, title, items, fetchedAt } = feed;

    try {
      await prisma.feed.create({
        data: {
          url,
          title: title ?? null,
          items: items as any,
          fetchedAt,
        },
      });
    } catch (e: any) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      ) {
        throw e;
      }
    }

    try {
      await prisma.feed.update({
        where: { url },
        data: {
          title: title ?? null,
          items: items as any,
          fetchedAt,
        },
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        await prisma.feed.create({
          data: {
            url,
            title: title ?? null,
            items: items as any,
            fetchedAt,
          },
        });
      } else {
        throw e;
      }
    }
  }

  return { findByUrl, upsert };
}
