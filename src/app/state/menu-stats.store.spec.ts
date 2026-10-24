import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MenuStats } from '../core/models';
import { MenuStatsStore } from './menu-stats.store';

const stats = (totalItems: number): MenuStats => ({
  totalItems,
  availableItems: totalItems,
  unavailableItems: 0,
  averagePrice: 10,
  byCategory: [],
});

describe('MenuStatsStore', () => {
  let store: MenuStatsStore;
  let http: HttpTestingController;

  const statsRequest = () => http.expectOne((req) => req.url === '/api/stats');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(MenuStatsStore);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    statsRequest().flush(stats(50_000));
  });

  afterEach(() => http.verify());

  it('filters the dashboard by fetching only aggregates, and a new restaurant clears the branch', () => {
    store.setRestaurant(1);
    store.setBranch(2);
    TestBed.tick();
    const branchRequest = statsRequest();
    expect(branchRequest.request.params.get('restaurantId')).toBe('1');
    expect(branchRequest.request.params.get('branchId')).toBe('2');
    branchRequest.flush(stats(1_400));
    expect(store.stats()?.totalItems).toBe(1_400);

    store.setRestaurant(3);
    TestBed.tick();
    const restaurantRequest = statsRequest();
    expect(restaurantRequest.request.params.has('branchId')).toBe(false);
    restaurantRequest.flush(stats(6_000));

    // No item list was requested at any point.
    http.expectNone((req) => req.url === '/api/items');
  });
});
