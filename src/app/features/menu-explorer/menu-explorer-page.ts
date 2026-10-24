import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MenuItem } from '../../core/models';
import { ErrorBanner } from '../../shared/error-banner';
import { FilterOptionsStore } from '../../state/filter-options.store';
import { MenuItemsStore } from '../../state/menu-items.store';
import { ItemEditDialog } from './item-edit-dialog';
import { MenuFilters } from './menu-filters';
import { MenuTable } from './menu-table';

/** Container page: connects the store to the presentational filters and table. */
@Component({
  selector: 'app-menu-explorer-page',
  imports: [DecimalPipe, MenuFilters, MenuTable, ErrorBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div>
        <h1>Menu Data Explorer</h1>
        <p class="subtitle">
          Search, filtering, sorting and pagination run in the API; the browser only receives one
          page.
        </p>
      </div>
    </header>

    @if (options.error(); as error) {
      <app-error-banner
        [message]="'Could not load filter options. ' + error"
        (retry)="options.reload()"
      />
    }

    <app-menu-filters
      [filters]="store.filters()"
      [restaurants]="options.restaurants()"
      [categories]="options.categories()"
      (filtersChange)="store.setFilters($event)"
    />

    <p class="summary" aria-live="polite">
      <strong>{{ store.total() | number }}</strong> matching items
    </p>

    @if (store.error(); as error) {
      <app-error-banner [message]="error" (retry)="store.reload()" />
    }

    <app-menu-table
      [items]="store.items()"
      [total]="store.total()"
      [query]="store.query()"
      [loading]="store.loading()"
      (sortChange)="store.setSort($event.sortBy, $event.sortOrder)"
      (pageChange)="store.setPage($event.page, $event.pageSize)"
      (itemSelected)="openEditor($event)"
    />
  `,
  styles: `
    .summary {
      margin: 0 0 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    .summary strong {
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class MenuExplorerPage {
  protected readonly store = inject(MenuItemsStore);
  protected readonly options = inject(FilterOptionsStore);
  private readonly dialog = inject(MatDialog);

  protected openEditor(item: MenuItem): void {
    this.dialog.open(ItemEditDialog, { data: item, width: '520px', maxWidth: '95vw' });
  }
}
