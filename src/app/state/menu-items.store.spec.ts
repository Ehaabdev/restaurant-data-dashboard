import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MenuItem, MenuStats, PagedResult } from '../core/models';
import { MenuItemsStore } from './menu-items.store';
import { MenuStatsStore } from './menu-stats.store';

function item(id: number, fields: Partial<MenuItem> = {}): MenuItem {
  return {
    id,
    name: `Item ${id}`,
    restaurantId: 1,
    restaurantName: 'Burger Republic',
    branchId: 1,
    branchName: 'Downtown',
    category: 'Burgers',
    price: 10,
    available: true,
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...fields,
  };
}

function page(items: MenuItem[], total = items.length): PagedResult<MenuItem> {
  return { items, total, page: 1, pageSize: 25 };
}

const stats: MenuStats = {
  totalItems: 2,
  availableItems: 1,
  unavailableItems: 1,
  averagePrice: 11.25,
  byCategory: [{ category: 'Burgers', count: 2 }],
};

describe('MenuItemsStore', () => {
  let store: MenuItemsStore;
  let http: HttpTestingController;

  const itemsRequest = () => http.expectOne((req) => req.url === '/api/items');
  const statsRequest = () => http.expectOne((req) => req.url === '/api/stats');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(MenuItemsStore);
    http = TestBed.inject(HttpTestingController);

    // Let the stores send their first requests and answer them.
    TestBed.tick();
    statsRequest().flush(stats);
    itemsRequest().flush(page([item(1), item(2)], 300));
  });

  afterEach(() => http.verify());

  it('sends filters, sorting and paging in one request, and returns to page 1 when filters change', () => {
    store.setPage(3, 50);
    TestBed.tick();
    expect(itemsRequest().request.params.get('page')).toBe('3');

    // Two changes in a row are combined into a single request.
    store.setSort('price', 'desc');
    store.setFilters({
      search: '  burger ',
      restaurantId: 1,
      branchId: 2,
      category: 'Burgers',
      available: true,
      minPrice: 10,
      maxPrice: 20,
    });
    TestBed.tick();

    const request = itemsRequest();
    const params = Object.fromEntries(
      request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
    );
    expect(params).toEqual({
      search: 'burger',
      restaurantId: '1',
      branchId: '2',
      category: 'Burgers',
      available: 'true',
      minPrice: '10',
      maxPrice: '20',
      sortBy: 'price',
      sortOrder: 'desc',
      page: '1',
      pageSize: '50',
    });

    request.flush(page([item(7), item(8)], 2));
    expect(store.status()).toBe('success');
    expect(store.total()).toBe(2);
    expect(store.items().map((i) => i.id)).toEqual([7, 8]);

    // Setting the same filters again does not send another request.
    store.setFilters({ ...store.filters() });
    TestBed.tick();
    http.expectNone((req) => req.url === '/api/items');
  });

  it('cancels an older request so a slow, stale response cannot overwrite newer results', () => {
    store.setFilters({ search: 'pizza' });
    TestBed.tick();
    const older = itemsRequest();

    store.setFilters({ search: 'burger' });
    TestBed.tick();
    const newer = itemsRequest();

    expect(older.cancelled).toBe(true);
    newer.flush(page([item(5, { name: 'Classic Burger' })]));

    expect(store.items().map((i) => i.name)).toEqual(['Classic Burger']);
    expect(store.filters()).toEqual({ search: 'burger' });
  });

  it('shows an error state on API failure, keeps the previous rows, and recovers on retry', () => {
    store.setPage(2, 25);
    TestBed.tick();
    expect(store.status()).toBe('loading');
    itemsRequest().flush(
      { message: 'Simulated server error' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Simulated server error');
    expect(store.items().map((i) => i.id)).toEqual([1, 2]);

    store.reload();
    itemsRequest().flush(page([item(26)], 300));

    expect(store.status()).toBe('success');
    expect(store.error()).toBeNull();
    expect(store.items().map((i) => i.id)).toEqual([26]);
  });

  it('after an edit, updates the row at once and then refreshes the page and the KPIs', async () => {
    const statsStore = TestBed.inject(MenuStatsStore);
    const saved = firstValueFrom(store.updateItem(1, { price: 12.5, available: false }));

    const patch = http.expectOne({ method: 'PATCH', url: '/api/items/1' });
    expect(patch.request.body).toEqual({ price: 12.5, available: false });
    patch.flush(item(1, { price: 12.5, available: false }));
    await saved;

    // 1. The row changed immediately, before any refresh came back.
    expect(store.items()[0]).toMatchObject({ id: 1, price: 12.5, available: false });

    // 2. The same page and 3. the KPIs are fetched again.
    const refreshedPage = itemsRequest();
    expect(refreshedPage.request.params.get('page')).toBe('1');
    const refreshedStats = statsRequest();
    expect(statsStore.status()).toBe('loading');

    const newStats = { ...stats, availableItems: 0, unavailableItems: 2 };
    refreshedStats.flush(newStats);
    refreshedPage.flush(page([item(1, { price: 12.5, available: false }), item(2)], 300));

    expect(statsStore.stats()).toEqual(newStats);
    expect(store.items()[0].price).toBe(12.5);
  });

  it('leaves the state unchanged when the API rejects an edit', async () => {
    const saved = firstValueFrom(store.updateItem(1, { price: -1 }));
    http
      .expectOne({ method: 'PATCH', url: '/api/items/1' })
      .flush(
        { message: 'Invalid item update', details: ['"price" must be between 0.01 and 10000'] },
        { status: 400, statusText: 'Bad Request' },
      );

    await expect(saved).rejects.toBeTruthy();
    expect(store.items()[0].price).toBe(10);
    http.expectNone((req) => req.url === '/api/stats');
  });
});
