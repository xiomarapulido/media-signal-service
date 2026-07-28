import type { Request, Response } from "express";

import {
  getArticleCounts,
  getArticles,
} from "../services/articles.service.js";
import {
  BooleanSearchParserError,
  BooleanSearchTokenizerError,
} from "../search/boolean-search.types.js";

export async function getArticlesHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const limit = request.query.limit
    ? Number(request.query.limit)
    : undefined;

  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit <= 0)
  ) {
    response.status(400).json({
      message: "Limit must be a positive integer.",
    });
    return;
  }

  try {
    const articles = await getArticles({
      source: request.query.source as string | undefined,
      language: request.query.language as string | undefined,
      dateFrom: request.query.dateFrom as string | undefined,
      dateTo: request.query.dateTo as string | undefined,
      search: request.query.search as string | undefined,
      limit,
      cursor:
        request.query.cursorPublishedAt && request.query.cursorId
          ? {
              publishedAt: request.query.cursorPublishedAt as string,
              id: request.query.cursorId as string,
            }
          : undefined,
    });

    response.json(articles);
  } catch (error) {
    if (
      error instanceof BooleanSearchTokenizerError ||
      error instanceof BooleanSearchParserError
    ) {
      response.status(400).json({
        message: error.message,
        position: error.position,
      });
      return;
    }

    console.error(error);

    response.status(500).json({
      message: "Failed to fetch articles.",
    });
  }
}

export async function getArticleCountsHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const interval = (request.query.interval as string | undefined) ?? "month";

  if (interval !== "week" && interval !== "month") {
    response.status(400).json({
      message: 'Interval must be either "week" or "month".',
    });
    return;
  }

  try {
    const counts = await getArticleCounts(interval, {
      source: request.query.source as string | undefined,
      language: request.query.language as string | undefined,
      dateFrom: request.query.dateFrom as string | undefined,
      dateTo: request.query.dateTo as string | undefined,
    });

    response.json(counts);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Failed to retrieve article aggregates.",
    });
  }
}