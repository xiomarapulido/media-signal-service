import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Article,
  ArticleCursor
} from '../../models/article';
import { ArticleService } from '../../services/article.service';
import { StripHtmlPipe } from '../../pipes/strip-html.pipe';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule, StripHtmlPipe],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search implements OnInit {
  articles: Article[] = [];
  searchText = '';
  nextCursor: ArticleCursor | null = null;
  loading = false;
  loadingMore = false;
  errorMessage = '';

  constructor(
    private readonly articleService: ArticleService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  search(): void {
    this.articles = [];
    this.nextCursor = null;
    this.loadArticles(this.searchText);
  }

  loadMore(): void {
    if (!this.nextCursor || this.loadingMore) {
      return;
    }

    this.loadingMore = true;

    this.articleService
      .getArticles(this.searchText, this.nextCursor)
      .subscribe({
        next: response => {
          this.articles = [...this.articles, ...response.articles];
          this.nextCursor = response.nextCursor ?? null;
          this.loadingMore = false;
          this.changeDetector.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Could not load more articles.';
          this.loadingMore = false;
          this.changeDetector.detectChanges();
        }
      });
  }

  private loadArticles(search?: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.articleService.getArticles(search).subscribe({
      next: response => {
        this.articles = response.articles;
        this.nextCursor = response.nextCursor ?? null;
        this.loading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load articles.';
        this.loading = false;
        this.changeDetector.detectChanges();
      }
    });
  }
}