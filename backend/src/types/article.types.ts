import type { QueryResultRow } from "pg";

export interface Article {
  id: string;
  external_id: number;
  headline: string | null;
  body: string;
  source: string;
  published_at: Date;
  language: string;
  summary: string | null;
  sentiment: string | null;
  topics: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ArticleFilters {
  source?: string;
  language?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
}

export interface ArticleCursor {
  publishedAt: string | Date;
  id: string;
}

export interface GetArticlesOptions extends ArticleFilters {
  cursor?: ArticleCursor;
  limit?: number;
}

export interface PaginatedArticles {
  articles: Article[];
  nextCursor: ArticleCursor | null;
}

export type GroupingInterval = "week" | "month";

export interface ArticleCount {
  period: Date;
  count: number;
}

/**
 * Represents an article row returned directly by PostgreSQL.
 */
export interface ArticleRow extends QueryResultRow, Article {}

/**
 * PostgreSQL returns COUNT values as strings because COUNT uses BIGINT.
 */
export interface ArticleCountRow extends QueryResultRow {
  period: Date;
  count: string;
}