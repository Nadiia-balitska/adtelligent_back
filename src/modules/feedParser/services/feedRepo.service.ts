import type { Collection } from "mongodb";
import type { ParsedFeed } from "./parseFeed.service";

export type FeedDoc = ParsedFeed & { _id?: any };

export function createFeedRepo(coll: Collection<FeedDoc>) {
  async function findByUrl(url: string): Promise<FeedDoc | null> {
    return coll.findOne({ url });
  }

  async function upsert(feed: ParsedFeed): Promise<void> {
    await coll.updateOne(
      { url: feed.url },
      {
        $set: {
          title: feed.title,
          items: feed.items,
          fetchedAt: feed.fetchedAt,
        },
      },
      { upsert: true }
    );
  }

  return {
    findByUrl,
    upsert,
  };
}
