import { load } from "cheerio";

export type Article = {
  url: string;
  title: string | null;
  content: string | null;
  publishedAt: string | null;
};

export async function parseArticle(url: string): Promise<Article> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("text/html")) {
    throw new Error("Not an HTML page");
  }

  const html = await res.text();
  const $ = load(html);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    null;

  const $container = $("article").first().length
    ? $("article").first()
    : $("main, .content, .post").first();

  const paragraphs = ($container.length ? $container : $("body"))
    .find("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const pub =
    $('meta[property="article:published_time"]').attr("content") ||
    $("time[datetime]").attr("datetime") ||
    null;

  return {
    url,
    title,
    content: paragraphs.length ? paragraphs.join("\n\n") : null,
    publishedAt: pub ? new Date(pub).toISOString() : null,
  };
}
