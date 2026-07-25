import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { pool } from "./connection.js";

type Sentiment = "positive" | "negative" | "neutral" | "mixed";

interface ArticleSeed {
  id: number;
  headline?: string | null;
  body: string;
  source: string;
  published_at: string;
  language: string;
  summary?: string | null;
  sentiment?: Sentiment | null;
  topics?: string[];
}

function isArticleSeed(value: unknown): value is ArticleSeed {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const article = value as Record<string, unknown>;

  return (
    typeof article.id === "number" &&
    Number.isInteger(article.id) &&
    article.id > 0 &&
    typeof article.body === "string" &&
    article.body.trim().length > 0 &&
    typeof article.source === "string" &&
    article.source.trim().length > 0 &&
    typeof article.published_at === "string" &&
    !Number.isNaN(Date.parse(article.published_at)) &&
    typeof article.language === "string" &&
    article.language.trim().length > 0
  );
}

async function loadArticles(filePath: string): Promise<ArticleSeed[]> {
  const fileContents = await readFile(filePath, "utf8");
  const parsedData: unknown = JSON.parse(fileContents);

  if (!Array.isArray(parsedData)) {
    throw new Error("sample_articles.json must contain an array");
  }

  const invalidArticleIndex = parsedData.findIndex(
    (article) => !isArticleSeed(article),
  );

  if (invalidArticleIndex !== -1) {
    throw new Error(
      `Invalid article at index ${invalidArticleIndex} in sample_articles.json`,
    );
  }

  return parsedData;
}

async function seedDatabase(): Promise<void> {
  const filePath = resolve(process.cwd(), "sample_articles.json");
  const articles = await loadArticles(filePath);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const article of articles) {
      await client.query(
        `
          INSERT INTO articles (
            external_id,
            headline,
            body,
            source,
            published_at,
            language,
            summary,
            sentiment,
            topics
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9::jsonb
          )
          ON CONFLICT (source, external_id)
          DO UPDATE SET
            headline = EXCLUDED.headline,
            body = EXCLUDED.body,
            published_at = EXCLUDED.published_at,
            language = EXCLUDED.language,
            summary = EXCLUDED.summary,
            sentiment = EXCLUDED.sentiment,
            topics = EXCLUDED.topics;
        `,
        [
          article.id,
          article.headline ?? null,
          article.body,
          article.source.trim(),
          article.published_at,
          article.language.trim(),
          article.summary ?? null,
          article.sentiment ?? null,
          JSON.stringify(article.topics ?? []),
        ],
      );
    }

    await client.query("COMMIT");

    console.log(`Successfully seeded ${articles.length} articles.`);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Failed to seed the database:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void seedDatabase();