import type { QueryResultRow } from "pg";

import { pool } from "../database/connection.js";
import type { Article } from "../types/article.types.js";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;
const MAX_HEADLINE_LENGTH = 500;
const MAX_BODY_LENGTH = 6_000;
const MAX_SUMMARY_LENGTH = 600;
const MAX_TOPIC_LENGTH = 50;

const VALID_SENTIMENTS = [
  "positive",
  "negative",
  "neutral",
  "mixed",
] as const;

const TOPIC_RULES: ReadonlyArray<{
  topic: string;
  keywords: readonly string[];
}> = [
  {
    topic: "Energy",
    keywords: [
      "oil",
      "gas",
      "renewable",
      "solar",
      "energy",
    ],
  },
  {
    topic: "Geopolitics",
    keywords: [
      "government",
      "war",
      "sanction",
      "election",
      "geopolitical",
    ],
  },
  {
    topic: "Technology",
    keywords: [
      "technology",
      "software",
      "artificial intelligence",
      "startup",
      "digital",
    ],
  },
  {
    topic: "Economy",
    keywords: [
      "economy",
      "inflation",
      "market",
      "trade",
      "interest rate",
    ],
  },
  {
    topic: "Healthcare",
    keywords: [
      "healthcare",
      "medical",
      "hospital",
      "patient",
      "diagnostic",
    ],
  },
];

type ArticleSentiment = (typeof VALID_SENTIMENTS)[number];

interface PendingArticleRow extends QueryResultRow {
  id: Article["id"];
  headline: Article["headline"];
  body: Article["body"];
}

interface ArticleEnrichment {
  summary: string;
  sentiment: ArticleSentiment;
  topics: string[];
}

export interface EnrichmentBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export async function enrichPendingArticles(
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<EnrichmentBatchResult> {
  const normalizedBatchSize = normalizeBatchSize(batchSize);
  const articles = await getPendingArticles(
    normalizedBatchSize,
  );

  const result: EnrichmentBatchResult = {
    processed: articles.length,
    succeeded: 0,
    failed: 0,
  };

  for (const article of articles) {
    try {
      const headline =
        article.headline !== null
          ? sanitizeText(article.headline).slice(
              0,
              MAX_HEADLINE_LENGTH,
            )
          : null;

      const body = sanitizeText(article.body).slice(
        0,
        MAX_BODY_LENGTH,
      );

      const enrichment = createMockEnrichment(
        headline,
        body,
      );

      const validatedEnrichment =
        validateEnrichment(enrichment);

      await saveEnrichment(
        article.id,
        validatedEnrichment,
      );

      result.succeeded++;
    } catch (error) {
      result.failed++;

      console.error(
        `Failed to enrich article ${article.id}.`,
        error,
      );
    }
  }

  return result;
}

async function getPendingArticles(
  batchSize: number,
): Promise<PendingArticleRow[]> {
  const result = await pool.query<PendingArticleRow>(
    `
      SELECT
        id,
        headline,
        body
      FROM articles
      WHERE
        summary IS NULL
        OR sentiment IS NULL
        OR topics = '[]'::jsonb
      ORDER BY published_at ASC, id ASC
      LIMIT $1
    `,
    [batchSize],
  );

  return result.rows;
}

function createMockEnrichment(
  headline: string | null,
  body: string,
): ArticleEnrichment {
  const combinedText = `${headline ?? ""} ${body}`
    .toLowerCase()
    .trim();

  return {
    summary: createSummary(headline, body),
    sentiment: detectSentiment(combinedText),
    topics: detectTopics(combinedText),
  };
}

function createSummary(
  headline: string | null,
  body: string,
): string {
  const sentences = extractSentences(body, 2);
  const normalizedHeadline = headline?.trim();

  if (
    normalizedHeadline !== undefined &&
    normalizedHeadline.length > 0 &&
    sentences.length > 0
  ) {
    const firstSentence = sentences[0];

    if (firstSentence !== undefined) {
      return `${ensureSentence(
        normalizedHeadline,
      )} ${ensureSentence(firstSentence)}`;
    }
  }

  if (sentences.length > 0) {
    return sentences
      .map((sentence) => ensureSentence(sentence))
      .join(" ");
  }

  if (
    normalizedHeadline !== undefined &&
    normalizedHeadline.length > 0
  ) {
    return ensureSentence(normalizedHeadline);
  }

  return "The article does not contain enough information to generate a detailed summary.";
}

function detectSentiment(
  text: string,
): ArticleSentiment {
  const positiveMatches = countKeywordMatches(text, [
    "growth",
    "improve",
    "recovery",
    "success",
    "agreement",
    "gain",
  ]);

  const negativeMatches = countKeywordMatches(text, [
    "crisis",
    "decline",
    "loss",
    "conflict",
    "attack",
    "shortage",
  ]);

  if (positiveMatches > 0 && negativeMatches > 0) {
    return "mixed";
  }

  if (positiveMatches > negativeMatches) {
    return "positive";
  }

  if (negativeMatches > positiveMatches) {
    return "negative";
  }

  return "neutral";
}

function detectTopics(text: string): string[] {
  const topics = TOPIC_RULES
    .filter(({ keywords }) =>
      keywords.some((keyword) => text.includes(keyword)),
    )
    .map(({ topic }) => topic)
    .slice(0, 3);

  return topics.length > 0 ? topics : ["General"];
}

function validateEnrichment(
  enrichment: ArticleEnrichment,
): ArticleEnrichment {
  const summary = enrichment.summary.trim();

  if (!summary) {
    throw new Error(
      "Enrichment summary cannot be empty.",
    );
  }

  if (
    !VALID_SENTIMENTS.includes(enrichment.sentiment)
  ) {
    throw new Error(
      `Invalid sentiment: ${enrichment.sentiment}`,
    );
  }

  const topics = [
    ...new Set(
      enrichment.topics
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0)
        .map((topic) =>
          topic.slice(0, MAX_TOPIC_LENGTH),
        ),
    ),
  ].slice(0, 3);

  if (topics.length === 0) {
    throw new Error(
      "Enrichment must contain at least one topic.",
    );
  }

  return {
    summary: summary.slice(0, MAX_SUMMARY_LENGTH),
    sentiment: enrichment.sentiment,
    topics,
  };
}

async function saveEnrichment(
  articleId: Article["id"],
  enrichment: ArticleEnrichment,
): Promise<void> {
  await pool.query(
    `
      UPDATE articles
      SET
        summary = $1,
        sentiment = $2,
        topics = $3::jsonb,
        updated_at = NOW()
      WHERE
        id = $4::uuid
        AND (
          summary IS NULL
          OR sentiment IS NULL
          OR topics = '[]'::jsonb
        )
    `,
    [
      enrichment.summary,
      enrichment.sentiment,
      JSON.stringify(enrichment.topics),
      articleId,
    ],
  );
}

/*
 * Removes executable markup and limits the amount of untrusted
 * content passed into the enrichment operation.
 */
function sanitizeText(value: string): string {
  return value
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      " ",
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSentences(
  text: string,
  maximum: number,
): string[] {
  const matches = text.match(/[^.!?]+[.!?]?/g);

  if (matches === null) {
    return [];
  }

  return matches
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, maximum);
}

function ensureSentence(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return /[.!?]$/.test(trimmedValue)
    ? trimmedValue
    : `${trimmedValue}.`;
}

function countKeywordMatches(
  text: string,
  keywords: readonly string[],
): number {
  return keywords.reduce(
    (total, keyword) =>
      text.includes(keyword) ? total + 1 : total,
    0,
  );
}

function normalizeBatchSize(batchSize: number): number {
  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1
  ) {
    throw new Error(
      "Batch size must be a positive integer.",
    );
  }

  return Math.min(batchSize, MAX_BATCH_SIZE);
}