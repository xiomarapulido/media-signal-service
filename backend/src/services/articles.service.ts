import { pool } from "../database/connection.js";

import {
  addArticleFilters,
  buildWhereClause,
  normalizeLimit,
  validateGroupingInterval,
} from "../helpers/articles.helpers.js";

import type {
  ArticleCount,
  ArticleCountRow,
  ArticleFilters,
  ArticleRow,
  GetArticlesOptions,
  PaginatedArticles,
} from "../types/article.types.js";

/**
 * Fetches articles using keyset pagination.
 */
export async function getArticles(
  options: GetArticlesOptions = {},
): Promise<PaginatedArticles> {
  const limit = normalizeLimit(options.limit);
  const conditions: string[] = [];
  const values: unknown[] = [];

  addArticleFilters(options, conditions, values);

  if (options.cursor) {
    values.push(options.cursor.publishedAt);
    const publishedAtParameter = `$${values.length}`;

    values.push(options.cursor.id);
    const idParameter = `$${values.length}`;

    conditions.push(
      `(published_at, id) < (
        ${publishedAtParameter}::timestamptz,
        ${idParameter}::uuid
      )`,
    );
  }

  const whereClause = buildWhereClause(conditions);

  // Fetch one extra record to determine whether another page exists.
  values.push(limit + 1);
  const limitParameter = `$${values.length}`;

  const result = await pool.query<ArticleRow>(
    `
      SELECT
        id,
        external_id,
        headline,
        body,
        source,
        published_at,
        language,
        summary,
        sentiment,
        topics,
        created_at,
        updated_at
      FROM articles
      ${whereClause}
      ORDER BY published_at DESC, id DESC
      LIMIT ${limitParameter}
    `,
    values,
  );

  const hasNextPage = result.rows.length > limit;

  const articles = hasNextPage
    ? result.rows.slice(0, limit)
    : result.rows;

  const lastArticle =
    articles.length > 0
      ? articles[articles.length - 1]
      : undefined;

  return {
    articles,
    nextCursor:
      hasNextPage && lastArticle
        ? {
            publishedAt: lastArticle.published_at,
            id: lastArticle.id,
          }
        : null,
  };
}

/**
 * Returns article totals grouped by week or month.
 */
export async function getArticleCounts(
  interval: string,
  filters: ArticleFilters = {},
): Promise<ArticleCount[]> {
  validateGroupingInterval(interval);

  const conditions: string[] = [];
  const values: unknown[] = [];

  addArticleFilters(filters, conditions, values);

  const whereClause = buildWhereClause(conditions);

  const result = await pool.query<ArticleCountRow>(
    `
      SELECT
        DATE_TRUNC('${interval}', published_at) AS period,
        COUNT(*) AS count
      FROM articles
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `,
    values,
  );

  return result.rows.map((row) => ({
    period: row.period,
    count: Number(row.count),
  }));
}