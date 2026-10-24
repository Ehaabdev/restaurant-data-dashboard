import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ItemQuery, MenuItem, PAGE_SIZE_OPTIONS, SortField, SortOrder } from '../../core/models';

export interface SortChange {
  sortBy?: SortField;
  sortOrder: SortOrder;
}

export interface PageChange {
  page: number;
  pageSize: number;
}

/**
 * Presentational table. It renders only the current page (25-100 rows) that
 * the store received; sorting and paging are emitted as events and done by the API.
 */
@Component({
  selector: 'app-menu-table',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-table.html',
  styleUrl: './menu-table.scss',
})
export class MenuTable {
  readonly items = input.required<MenuItem[]>();
  readonly total = input.required<number>();
  readonly query = input.required<ItemQuery>();
  readonly loading = input(false);

  readonly sortChange = output<SortChange>();
  readonly pageChange = output<PageChange>();
  readonly itemSelected = output<MenuItem>();

  protected readonly columns = ['id', 'name', 'restaurant', 'branch', 'category', 'price', 'available', 'lastUpdated', 'actions'];
  protected readonly pageSizeOptions = [...PAGE_SIZE_OPTIONS];

  /** Lets the table reuse row elements for items it already rendered. */
  protected readonly trackById = (_index: number, item: MenuItem) => item.id;

  protected onSort({ active, direction }: Sort): void {
    this.sortChange.emit(direction ? { sortBy: active as SortField, sortOrder: direction } : { sortOrder: 'asc' });
  }

  protected onPage({ pageIndex, pageSize }: PageEvent): void {
    this.pageChange.emit({ page: pageIndex + 1, pageSize });
  }
}
