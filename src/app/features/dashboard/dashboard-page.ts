import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ErrorBanner } from '../../shared/error-banner';
import { FilterOptionsStore } from '../../state/filter-options.store';
import { MenuStatsStore } from '../../state/menu-stats.store';
import { CategoryChart } from './category-chart';
import { KpiCard } from './kpi-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    PercentPipe,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    ErrorBanner,
    KpiCard,
    CategoryChart,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly store = inject(MenuStatsStore);
  protected readonly options = inject(FilterOptionsStore);

  protected readonly branches = computed(() => {
    const restaurantId = this.store.filters().restaurantId;
    return this.options.restaurants().find((restaurant) => restaurant.id === restaurantId)?.branches ?? [];
  });

  protected readonly availableShare = computed(() => {
    const stats = this.store.stats();
    return stats?.totalItems ? stats.availableItems / stats.totalItems : 0;
  });
}
