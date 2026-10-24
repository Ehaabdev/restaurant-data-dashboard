import { computed, inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuApi } from '../core/menu-api';
import { MenuStats } from '../core/models';
import { connectRemoteState, initialRemoteState, RemoteState, shallowEqual } from './remote-state';

export interface StatsFilters {
  restaurantId?: number;
  branchId?: number;
}

/**
 * State for the Dashboard Overview. KPIs are aggregated by the API over the
 * full dataset, so filtering the dashboard only downloads a few numbers,
 * never the items themselves.
 */
@Injectable({ providedIn: 'root' })
export class MenuStatsStore {
  private readonly api = inject(MenuApi);

  private readonly _filters = signal<StatsFilters>({}, { equal: shallowEqual });
  private readonly remote = signal<RemoteState<MenuStats | null>>(initialRemoteState(null));
  private readonly reload$ = new Subject<void>();

  readonly filters = this._filters.asReadonly();
  readonly stats = computed(() => this.remote().data);
  readonly status = computed(() => this.remote().status);
  readonly loading = computed(() => this.status() === 'loading');
  readonly error = computed(() => this.remote().error);

  constructor() {
    connectRemoteState({
      request: this._filters,
      reload$: this.reload$,
      fetch: (filters) => this.api.getStats(filters),
      target: this.remote,
    });
  }

  setRestaurant(restaurantId: number | undefined): void {
    // A branch belongs to one restaurant, so changing restaurant clears it.
    this._filters.set({ restaurantId });
  }

  setBranch(branchId: number | undefined): void {
    this._filters.update((filters) => ({ ...filters, branchId }));
  }

  /** Called after an item is edited, so the KPIs stay consistent. */
  reload(): void {
    this.reload$.next();
  }
}
