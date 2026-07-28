import type {
  ArticleFilters,
  GroupingInterval,
} from "../types/article.types.js";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Validates and normalizes the requested page size.
 *
 * The maximum value prevents callers from requesting an excessively
 * large number of records in a single database query.
 */
export function normalizeLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Limit must be a positive integer");
  }

  return Math.min(limit, MAX_PAGE_SIZE);
}

/**
 * Validates the aggregation interval against an explicit allowlist.
 *
 * The interval is interpolated into DATE_TRUNC because PostgreSQL does
 * not support using a query parameter for this SQL identifier.
 */
export function validateGroupingInterval(
  interval: string,
): asserts interval is GroupingInterval {
  if (interval !== "week" && interval !== "month") {
    throw new Error('Grouping interval must be either "week" or "month"');
  }
}

/**
 * Adds optional article filters to a SQL condition list.
 *
 * All filter values are stored separately and referenced through
 * positional PostgreSQL parameters.
 */
export function addArticleFilters(
  filters: ArticleFilters,
  conditions: string[],
  values: unknown[],
): void {
  if (filters.source) {
    values.push(filters.source);
    conditions.push(`source = $${values.length}`);
  }

  if (filters.language) {
    values.push(filters.language);
    conditions.push(`language = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`published_at >= $${values.length}::timestamptz`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`published_at <= $${values.length}::timestamptz`);
  }
}

/**
 * Creates a WHERE clause from a list of SQL conditions.
 */
export function buildWhereClause(conditions: string[]): string {
  return conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
}