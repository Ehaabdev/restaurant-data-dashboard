import { computed, inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuApi } from '../core/menu-api';
import { FilterOptions } from '../core/models';
import { connectRemoteState, initialRemoteState, RemoteState } from './remote-state';

/** Restaurants, branches and categories for the filter dropdowns. Loaded once, shared by both pages. */
@Injectable({ providedIn: 'root' })
export class FilterOptionsStore {
  private readonly api = inject(MenuApi);
  private readonly remote = signal<RemoteState<FilterOptions>>(initialRemoteState({ restaurants: [], categories: [] }));
  private readonly reload$ = new Subject<void>();

  readonly restaurants = computed(() => this.remote().data.restaurants);
  readonly categories = computed(() => this.remote().data.categories);
  readonly error = computed(() => this.remote().error);

  constructor() {
    connectRemoteState({
      request: signal(null),
      reload$: this.reload$,
      fetch: () => this.api.getFilterOptions(),
      target: this.remote,
    });
  }

  reload(): void {
    this.reload$.next();
  }
}
