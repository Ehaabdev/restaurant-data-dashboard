/**
 * API contract shared by the Angular client (src/) and the mock API (server/).
 * Keeping one copy means the two sides cannot drift apart.
 */

export interface MenuItem {
  id: number;
  name: string;
  restaurantId: number;
  restaurantName: string;
  branchId: number;
  branchName: string;
  category: string;
  price: number;
  available: boolean;
  /** ISO 8601 timestamp. */
  lastUpdated: string;
}

export type SortField = 'name' | 'price' | 'lastUpdated';
export type SortOrder = 'asc' | 'desc';

export interface ItemFilters {
  search?: string;
  restaurantId?: number;
  branchId?: number;
  category?: string;
  available?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface ItemQuery extends ItemFilters {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface PagedResult<T> {
  items: T[];
  /** Number of records matching the filters, across all pages. */
  total: number;
  page: number;
  pageSize: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface MenuStats {
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  averagePrice: number;
  byCategory: CategoryCount[];
}

export interface BranchOption {
  id: number;
  name: string;
}

export interface RestaurantOption {
  id: number;
  name: string;
  branches: BranchOption[];
}

export interface FilterOptions {
  restaurants: RestaurantOption[];
  categories: string[];
}

/** Fields a client is allowed to change with PATCH /api/items/:id. */
export type MenuItemPatch = Partial<Pick<MenuItem, 'price' | 'available'>>;

export interface ApiErrorBody {
  message: string;
  details?: string[];
}

/** Validation limits used by both the edit form and the API. */
export const PRICE_MIN = 0.01;
export const PRICE_MAX = 10_000;

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
