import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { CategoryCount } from '../../core/models';

// Register only the Chart.js parts a bar chart needs, to keep the bundle small.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/** Bar chart of item counts per category. Updates the existing chart instead of recreating it. */
@Component({
  selector: 'app-category-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-box">
      <canvas #canvas role="img" [attr.aria-label]="description()"></canvas>
    </div>
  `,
  styles: `
    :host {
      display: block;
      /* Read by the chart as its bar color, so it follows the Material theme. */
      color: var(--mat-sys-primary);
    }
    .chart-box {
      position: relative;
      height: 320px;
    }
  `,
})
export class CategoryChart {
  readonly data = input.required<CategoryCount[]>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'bar', number[], string>;

  protected readonly description = computed(
    () => 'Items by category: ' + this.data().map(({ category, count }) => `${category} ${count}`).join(', '),
  );

  constructor() {
    afterRenderEffect(() => this.render(this.data()));
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private render(data: CategoryCount[]): void {
    const labels = data.map((entry) => entry.category);
    const counts = data.map((entry) => entry.count);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = counts;
      this.chart.update();
      return;
    }

    const canvas = this.canvas().nativeElement;
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Items', data: counts, backgroundColor: getComputedStyle(canvas).color, borderRadius: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }
}
