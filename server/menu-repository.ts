import {
  FilterOptions,
  ItemFilters,
  ItemQuery,
  MenuItem,
  MenuStats,
  PagedResult,
  RestaurantOption,
  SortField,
} from '../shared/models';
import { compareBy, computeStats, queryItems } from './query';

/** Fields that change when an item is edited. */
export type ItemChanges = Partial<Pick<MenuItem, 'price' | 'available' | 'lastUpdated'>>;

/**
 * In-memory "database" for the mock API. The full dataset lives here on the
 * server, so the browser only ever receives one page of items at a time.
 */
export class MenuRepository {
  readonly filterOptions: FilterOptions;
  private readonly byId = new Map<number, MenuItem>();
  /** Lazily built copies of `items` sorted by each field (ascending). */
  private readonly sorted = new Map<SortField, MenuItem[]>();

  constructor(private readonly items: MenuItem[]) {
    for (const item of items) this.byId.set(item.id, item);
    this.filterOptions = buildFilterOptions(items);
  }

  query(query: ItemQuery): PagedResult<MenuItem> {
    const source = query.sortBy ? this.sortedBy(query.sortBy) : this.items;
    return queryItems(source, query);
  }

  stats(filters: ItemFilters): MenuStats {
    return computeStats(this.items, filters);
  }

  has(id: number): boolean {
    return this.byId.has(id);
  }

  update(id: number, changes: ItemChanges): MenuItem | undefined {
    const item = this.byId.get(id);
    if (!item) return undefined;

    Object.assign(item, changes);
    // Sorted copies hold the same object references, so only orders that
    // depend on a changed field need rebuilding.
    if (changes.price !== undefined) this.sorted.delete('price');
    if (changes.lastUpdated !== undefined) this.sorted.delete('lastUpdated');
    return { ...item };
  }

  private sortedBy(field: SortField): MenuItem[] {
    let list = this.sorted.get(field);
    if (!list) {
      list = [...this.items].sort(compareBy(field));
      this.sorted.set(field, list);
    }
    return list;
  }
}

function buildFilterOptions(items: readonly MenuItem[]): FilterOptions {
  const restaurants = new Map<number, RestaurantOption>();
  const categories = new Set<string>();

  for (const item of items) {
    categories.add(item.category);
    let restaurant = restaurants.get(item.restaurantId);
    if (!restaurant) {
      restaurant = { id: item.restaurantId, name: item.restaurantName, branches: [] };
      restaurants.set(item.restaurantId, restaurant);
    }
    if (!restaurant.branches.some((branch) => branch.id === item.branchId)) {
      restaurant.branches.push({ id: item.branchId, name: item.branchName });
    }
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return {
    restaurants: [...restaurants.values()]
      .map((restaurant) => ({ ...restaurant, branches: restaurant.branches.sort(byName) }))
      .sort(byName),
    categories: [...categories].sort(),
  };
}
