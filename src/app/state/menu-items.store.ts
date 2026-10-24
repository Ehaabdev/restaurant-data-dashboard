import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { MenuApi } from '../core/menu-api';
import {
  DEFAULT_PAGE_SIZE,
  ItemFilters,
  ItemQuery,
  MenuItem,
  MenuItemPatch,
  PagedResult,
  SortField,
  SortOrder,
} from '../core/models';
import { MenuStatsStore } from './menu-stats.store';
import { connectRemoteState, initialRemoteState, RemoteState, shallowEqual } from './remote-state';

const DEFAULT_QUERY: ItemQuery = { page: 1, pageSize: DEFAULT_PAGE_SIZE };

/**
 * State for the Menu Data Explorer.
 *  - UI state: `query` (filters, sort, page) is what the user wants to see.
 *  - Server state: `remote` is the page the API returned for that query.
 * Components read these signals and call the methods below; they never keep
 * shared state of their own.
 */
@Injectable({ providedIn: 'root' })
export class MenuItemsStore {
  private readonly api = inject(MenuApi);
  private readonly statsStore = inject(MenuStatsStore);

  /** `equal: shallowEqual` means setting an identical query sends no request. */
  private readonly _query = signal<ItemQuery>(DEFAULT_QUERY, { equal: shallowEqual });
  private readonly remote = signal<RemoteState<PagedResult<MenuItem>>>(
    initialRemoteState({ items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE }),
  );
  private readonly reload$ = new Subject<void>();

  readonly query = this._query.asReadonly();
  readonly filters = computed(() => activeFilters(this._query()), { equal: shallowEqual });
  readonly hasActiveFilters = computed(() => Object.keys(this.filters()).length > 0);
  readonly items = computed(() => this.remote().data.items);
  readonly total = computed(() => this.remote().data.total);
  readonly status = computed(() => this.remote().status);
  readonly loading = computed(() => this.status() === 'loading');
  readonly error = computed(() => this.remote().error);

  constructor() {
    connectRemoteState({
      request: this._query,
      reload$: this.reload$,
      fetch: (query) => this.api.getItems(query),
      target: this.remote,
    });
  }

  /** Changing filters always goes back to page 1. */
  setFilters(filters: ItemFilters): void {
    const next = activeFilters(filters);
    if (shallowEqual(next, this.filters())) return;
    this._query.update(({ pageSize, sortBy, sortOrder }) => ({
      ...next,
      pageSize,
      sortBy,
      sortOrder,
      page: 1,
    }));
  }

  resetFilters(): void {
    this.setFilters({});
  }

  /** Passing no field returns to the default (id) order. */
  setSort(sortBy: SortField | undefined, sortOrder: SortOrder = 'asc'): void {
    this._query.update((query) => ({
      ...query,
      sortBy,
      sortOrder: sortBy ? sortOrder : undefined,
      page: 1,
    }));
  }

  setPage(page: number, pageSize: number): void {
    this._query.update((query) => ({ ...query, page, pageSize }));
  }

  reload(): void {
    this.reload$.next();
  }

  /**
   * Saves through the API, then brings all state that shows this item up to date:
   *  1. the row is replaced at once, so the table changes immediately;
   *  2. the current page is fetched again, because the edit can change whether
   *     the item still matches the filters, or where it sorts;
   *  3. the KPIs are fetched again, because the server computes them from the
   *     full dataset.
   */
  updateItem(id: number, patch: MenuItemPatch): Observable<MenuItem> {
    return this.api.updateItem(id, patch).pipe(
      tap((updated) => {
        this.remote.update((state) => ({
          ...state,
          data: {
            ...state.data,
            items: state.data.items.map((item) => (item.id === id ? updated : item)),
          },
        }));
        this.reload();
        this.statsStore.reload();
      }),
    );
  }
}

const FILTER_KEYS = [
  'search',
  'restaurantId',
  'branchId',
  'category',
  'available',
  'minPrice',
  'maxPrice',
] as const;

/** Keeps only filters that are set, so `{ search: ' ' }` and `{}` mean the same. */
function activeFilters(source: ItemFilters): ItemFilters {
  const filters: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const raw = source[key];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (value !== undefined && value !== null && value !== '') filters[key] = value;
  }
  return filters as ItemFilters;
}
