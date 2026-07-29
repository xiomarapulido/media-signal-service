export interface Article {
  id: string;
  external_id: number;
  headline: string | null;
  body: string;
  source: string;
  published_at: string;
  language: string;
  summary: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | null;
  topics: string[];
  created_at: string;
  updated_at: string;
}

export interface ArticleCursor {
  publishedAt: string;
  id: string;
}

export interface ArticlesResponse {
  articles: Article[];
  nextCursor: ArticleCursor | null;
}

export interface ArticleAggregate {
  period: string;
  count: number;
}