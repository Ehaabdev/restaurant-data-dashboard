import {
  CategoryCount,
  ItemFilters,
  ItemQuery,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  MenuItem,
  MenuItemPatch,
  MenuStats,
  PagedResult,
  PRICE_MAX,
  PRICE_MIN,
  SortField,
} from '../shared/models';

/**
 * Pure query functions for the mock API. They take plain data in and return
 * plain data out, which keeps them independent of Express and easy to test.
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

type RawParams = Record<string, unknown>;

const SORT_FIELDS: readonly SortField[] = ['name', 'price', 'lastUpdated'];

function readString(raw: RawParams, key: string): string | undefined {
  const value = raw[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readNumber(raw: RawParams, key: string, errors: string[], { integer = false } = {}) {
  const text = readString(raw, key);
  if (text === undefined) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    errors.push(`"${key}" must be a${integer ? 'n integer' : ' number'}`);
    return undefined;
  }
  return value;
}

/** Reads the filter part of a query string (shared by /items and /stats). */
export function parseFilters(raw: RawParams): ParseResult<ItemFilters> {
  const errors: string[] = [];
  const filters: ItemFilters = {
    search: readString(raw, 'search'),
    restaurantId: readNumber(raw, 'restaurantId', errors, { integer: true }),
    branchId: readNumber(raw, 'branchId', errors, { integer: true }),
    category: readString(raw, 'category'),
    minPrice: readNumber(raw, 'minPrice', errors),
    maxPrice: readNumber(raw, 'maxPrice', errors),
  };

  const available = readString(raw, 'available');
  if (available === 'true' || available === 'false') {
    filters.available = available === 'true';
  } else if (available !== undefined) {
    errors.push('"available" must be "true" or "false"');
  }

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    errors.push('"minPrice" cannot be greater than "maxPrice"');
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: filters };
}

export function parseItemQuery(raw: RawParams): ParseResult<ItemQuery> {
  const filters = parseFilters(raw);
  const errors = filters.ok ? [] : [...filters.errors];

  const page = readNumber(raw, 'page', errors, { integer: true }) ?? 1;
  const pageSize = readNumber(raw, 'pageSize', errors, { integer: true }) ?? DEFAULT_PAGE_SIZE;
  if (page < 1) errors.push('"page" must be 1 or greater');
  if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    errors.push(`"pageSize" must be between 1 and ${MAX_PAGE_SIZE}`);
  }

  const sortBy = readString(raw, 'sortBy');
  if (sortBy !== undefined && !SORT_FIELDS.includes(sortBy as SortField)) {
    errors.push(`"sortBy" must be one of: ${SORT_FIELDS.join(', ')}`);
  }
  const sortOrder = readString(raw, 'sortOrder') ?? 'asc';
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    errors.push('"sortOrder" must be "asc" or "desc"');
  }

  if (errors.length || !filters.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...filters.value,
      page,
      pageSize,
      sortBy: sortBy as SortField | undefined,
      sortOrder: sortOrder as 'asc' | 'desc',
    },
  };
}

/** Builds one predicate for all active filters; inactive filters are skipped. */
export function createFilterPredicate(filters: ItemFilters): (item: MenuItem) => boolean {
  const search = filters.search?.toLowerCase();
  const { restaurantId, branchId, category, available, minPrice, maxPrice } = filters;

  return (item) =>
    (search === undefined || item.name.toLowerCase().includes(search)) &&
    (restaurantId === undefined || item.restaurantId === restaurantId) &&
    (branchId === undefined || item.branchId === branchId) &&
    (category === undefined || item.category === category) &&
    (available === undefined || item.available === available) &&
    (minPrice === undefined || item.price >= minPrice) &&
    (maxPrice === undefined || item.price <= maxPrice);
}

/** Ascending comparator for a sort field; ties are broken by id so paging is stable. */
export function compareBy(field: SortField): (a: MenuItem, b: MenuItem) => number {
  return (a, b) => {
    const left = a[field];
    const right = b[field];
    if (left < right) return -1;
    if (left > right) return 1;
    return a.id - b.id;
  };
}

/**
 * Filters, sorts and paginates. `items` must already be ordered by
 * `query.sortBy` ascending (the repository keeps cached sorted copies),
 * so a request only costs one filtering pass instead of a full sort.
 */
export function queryItems(items: readonly MenuItem[], query: ItemQuery): PagedResult<MenuItem> {
  const matches = items.filter(createFilterPredicate(query));
  if (query.sortBy && query.sortOrder === 'desc') matches.reverse();

  const start = (query.page - 1) * query.pageSize;
  return {
    items: matches.slice(start, start + query.pageSize),
    total: matches.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function computeStats(items: readonly MenuItem[], filters: ItemFilters = {}): MenuStats {
  const matches = createFilterPredicate(filters);
  const categoryCounts = new Map<string, number>();
  let totalItems = 0;
  let availableItems = 0;
  let priceSum = 0;

  for (const item of items) {
    if (!matches(item)) continue;
    totalItems++;
    if (item.available) availableItems++;
    priceSum += item.price;
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const byCategory: CategoryCount[] = [...categoryCounts]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return {
    totalItems,
    availableItems,
    unavailableItems: totalItems - availableItems,
    averagePrice: totalItems ? Math.round((priceSum / totalItems) * 100) / 100 : 0,
    byCategory,
  };
}

/** Validates a PATCH body. Only `price` and `available` may be changed. */
export function parseItemPatch(body: unknown): ParseResult<MenuItemPatch> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }

  const errors: string[] = [];
  const patch: MenuItemPatch = {};
  const input = body as Record<string, unknown>;

  for (const key of Object.keys(input)) {
    if (key !== 'price' && key !== 'available') errors.push(`"${key}" cannot be updated`);
  }

  if ('price' in input) {
    const price = input['price'];
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      errors.push('"price" must be a number');
    } else if (price < PRICE_MIN || price > PRICE_MAX) {
      errors.push(`"price" must be between ${PRICE_MIN} and ${PRICE_MAX}`);
    } else if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
      errors.push('"price" can have at most 2 decimal places');
    } else {
      patch.price = price;
    }
  }

  if ('available' in input) {
    if (typeof input['available'] !== 'boolean') errors.push('"available" must be true or false');
    else patch.available = input['available'];
  }

  if (!errors.length && Object.keys(patch).length === 0) {
    errors.push('Nothing to update: send "price" and/or "available"');
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: patch };
}
