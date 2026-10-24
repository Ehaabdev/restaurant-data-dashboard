import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApiErrorBody,
  FilterOptions,
  ItemFilters,
  ItemQuery,
  MenuItem,
  MenuItemPatch,
  MenuStats,
  PagedResult,
} from './models';

/**
 * Data-access layer: the only place that knows about URLs and HTTP.
 * Stores call this service; components never call HttpClient directly.
 */
@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getItems(query: ItemQuery): Observable<PagedResult<MenuItem>> {
    return this.http.get<PagedResult<MenuItem>>(`${this.baseUrl}/items`, { params: toParams(query) });
  }

  updateItem(id: number, patch: MenuItemPatch): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.baseUrl}/items/${id}`, patch);
  }

  getStats(filters: ItemFilters): Observable<MenuStats> {
    return this.http.get<MenuStats>(`${this.baseUrl}/stats`, { params: toParams(filters) });
  }

  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.baseUrl}/filters`);
  }
}

/** Turns an object into query params, leaving out empty values. */
function toParams(values: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
  }
  return params;
}

/** Converts any HTTP failure into a message that can be shown to the user. */
export function toErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  if (error.status === 0) return 'Cannot reach the server. Is the mock API running?';

  const body = error.error as Partial<ApiErrorBody> | null;
  if (body?.message) return body.details?.length ? `${body.message}: ${body.details.join('; ')}` : body.message;
  return `Request failed with status ${error.status}.`;
}
