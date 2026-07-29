import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Chart,
  ChartConfiguration,
  registerables
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ArticleAggregate } from '../../models/article';
import { ArticleService } from '../../services/article.service';

Chart.register(...registerables);

type GroupingInterval = 'month' | 'week';

@Component({
  selector: 'app-analytics',
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss'
})
export class Analytics implements OnInit {
  source = '';
  interval: GroupingInterval = 'month';

  totalArticles = 0;
  hasData = false;
  loading = false;
  errorMessage = '';

  readonly chartType: 'bar' = 'bar';

  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Articles per month',
        data: []
      }
    ]
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true
      },
      tooltip: {
        callbacks: {
          label: context =>
            `Articles: ${context.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        title: {
          display: true,
          text: 'Number of articles'
        }
      }
    }
  };

  constructor(
    private readonly articleService: ArticleService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  applyFilter(): void {
    this.loadAnalytics();
  }

  onIntervalChange(): void {
    this.loadAnalytics();
  }

  clearFilter(): void {
    this.source = '';
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';

    this.articleService
      .getArticleAggregates(
        this.interval,
        this.source
      )
      .subscribe({
        next: aggregates => {
          this.totalArticles = aggregates.reduce(
            (total, item) =>
              total + Number(item.count),
            0
          );

          this.hasData = aggregates.length > 0;

          this.updateChart(aggregates);

          this.loading = false;
          this.changeDetector.detectChanges();
        },
        error: () => {
          this.totalArticles = 0;
          this.hasData = false;
          this.errorMessage =
            'Could not load analytics.';

          this.loading = false;
          this.changeDetector.detectChanges();
        }
      });
  }

  private updateChart(
    aggregates: ArticleAggregate[]
  ): void {
    this.chartData = {
      labels: aggregates.map(item =>
        this.formatPeriod(item.period)
      ),
      datasets: [
        {
          label:
            this.interval === 'week'
              ? 'Articles per week'
              : 'Articles per month',
          data: aggregates.map(item =>
            Number(item.count)
          ),
          backgroundColor: 'rgba(13, 148, 136, 0.75)',
          borderColor: '#0f766e',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 100
        }
      ]
    };
  }

  private formatPeriod(period: string): string {
    const date = new Date(period);

    if (this.interval === 'week') {
      return `Week of ${date.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }
      )}`;
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        year: 'numeric'
      }
    );
  }
}