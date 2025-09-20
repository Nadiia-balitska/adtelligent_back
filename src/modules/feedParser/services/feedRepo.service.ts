import type { Collection } from "mongodb";
import type { ParsedFeed } from "./parseFeed.service";

export type FeedDoc = ParsedFeed & { _id?: any };

export class FeedRepo {
  constructor(private coll: Collection<FeedDoc>) {}

  async findByUrl(url: string): Promise<FeedDoc | null> {
    return this.coll.findOne({ url });
  }

  async upsert(feed: ParsedFeed): Promise<void> {
    await this.coll.updateOne(
      { url: feed.url },
      {
        $set: {
          title: feed.title,
          items: feed.items,
          fetchedAt: feed.fetchedAt,
        },
      },
      { upsert: true },
    );
  }
}
