import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import { ItemFilters, RestaurantOption } from '../../core/models';
import { shallowEqual } from '../../state/remote-state';

/** How long to wait after the last keystroke or selection before searching. */
export const FILTER_DEBOUNCE_MS = 300;

const priceRange: ValidatorFn = (group) => {
  const min = group.get('minPrice')?.value;
  const max = group.get('maxPrice')?.value;
  return min != null && max != null && min > max ? { priceRange: true } : null;
};

/**
 * Presentational filter bar. It owns only its form; the result is emitted as
 * plain `ItemFilters` and the page passes it to the store.
 */
@Component({
  selector: 'app-menu-filters',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-filters.html',
  styleUrl: './menu-filters.scss',
})
export class MenuFilters implements OnInit {
  readonly filters = input.required<ItemFilters>();
  readonly restaurants = input.required<RestaurantOption[]>();
  readonly categories = input.required<string[]>();
  readonly filtersChange = output<ItemFilters>();

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      search: '',
      restaurantId: null as number | null,
      branchId: null as number | null,
      category: null as string | null,
      available: null as boolean | null,
      minPrice: [null as number | null, Validators.min(0)],
      maxPrice: [null as number | null, Validators.min(0)],
    },
    { validators: priceRange },
  );

  private readonly restaurantId = toSignal(this.form.controls.restaurantId.valueChanges, { initialValue: null });

  /** All branches grouped by restaurant, or only the selected restaurant's branches. */
  protected readonly branchGroups = computed(() => {
    const id = this.restaurantId();
    return id === null ? this.restaurants() : this.restaurants().filter((restaurant) => restaurant.id === id);
  });

  constructor() {
    // A branch belongs to one restaurant, so picking a restaurant clears the branch.
    this.form.controls.restaurantId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.branchId.setValue(null, { emitEvent: false }));

    // Debounce typing, skip invalid input and identical values, so each
    // burst of changes sends at most one request.
    this.form.valueChanges
      .pipe(
        debounceTime(FILTER_DEBOUNCE_MS),
        filter(() => this.form.valid),
        map(() => toFilters(this.form.getRawValue())),
        distinctUntilChanged(shallowEqual),
        takeUntilDestroyed(),
      )
      .subscribe((filters) => this.filtersChange.emit(filters));
  }

  ngOnInit(): void {
    // Start from the store's filters, so they survive leaving and returning to the page.
    const { search = '', restaurantId, branchId, category, available, minPrice, maxPrice } = this.filters();
    this.form.reset({
      search,
      restaurantId: restaurantId ?? null,
      branchId: branchId ?? null,
      category: category ?? null,
      available: available ?? null,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
    });
  }

  protected reset(): void {
    this.form.reset();
  }
}

interface FilterFormValue {
  search: string;
  restaurantId: number | null;
  branchId: number | null;
  category: string | null;
  available: boolean | null;
  minPrice: number | null;
  maxPrice: number | null;
}

function toFilters(value: FilterFormValue): ItemFilters {
  return {
    search: value.search.trim() || undefined,
    restaurantId: value.restaurantId ?? undefined,
    branchId: value.branchId ?? undefined,
    category: value.category ?? undefined,
    available: value.available ?? undefined,
    minPrice: value.minPrice ?? undefined,
    maxPrice: value.maxPrice ?? undefined,
  };
}
