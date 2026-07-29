import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ArticleAggregate,
  ArticleCursor,
  ArticlesResponse
} from '../models/article';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private readonly apiUrl = 'http://localhost:3000/articles';

  constructor(private readonly http: HttpClient) {}

  getArticles(
    search?: string,
    cursor?: ArticleCursor
  ): Observable<ArticlesResponse> {
    let params = new HttpParams().set('limit', '5');

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (cursor) {
      params = params
        .set('cursorPublishedAt', cursor.publishedAt)
        .set('cursorId', cursor.id);
    }

    return this.http.get<ArticlesResponse>(
      this.apiUrl,
      { params }
    );
  }

  getArticleAggregates(
    interval: 'month' | 'week',
    source?: string
  ): Observable<ArticleAggregate[]> {
    let params = new HttpParams().set('interval', interval);

    if (source?.trim()) {
      params = params.set('source', source.trim());
    }

    return this.http.get<ArticleAggregate[]>(
      `${this.apiUrl}/aggregate`,
      { params }
    );
  }
}