import { TestBed } from '@angular/core/testing';
import { ItemFilters } from '../../core/models';
import { FILTER_DEBOUNCE_MS, MenuFilters } from './menu-filters';

describe('MenuFilters', () => {
  let emitted: ItemFilters[];
  let element: HTMLElement;

  function type(selector: string, value: string) {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(MenuFilters);
    fixture.componentRef.setInput('filters', {});
    fixture.componentRef.setInput('restaurants', []);
    fixture.componentRef.setInput('categories', []);
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((filters) => emitted.push(filters));
    fixture.detectChanges();
    element = fixture.nativeElement;

    vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
    emitted.length = 0; // ignore the initial sync with the store's filters
  });

  afterEach(() => vi.useRealTimers());

  it('debounces fast typing into a single filter change', () => {
    for (const text of ['b', 'bu', 'bur', 'burg']) {
      type('input[formcontrolname=search]', text);
      vi.advanceTimersByTime(100);
    }
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
    expect(emitted).toEqual([{ search: 'burg' }]);
  });

  it('does not emit an invalid price range', () => {
    type('input[formcontrolname=minPrice]', '20');
    type('input[formcontrolname=maxPrice]', '5');
    vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
    expect(emitted).toEqual([]);

    type('input[formcontrolname=maxPrice]', '25');
    vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
    expect(emitted).toEqual([{ minPrice: 20, maxPrice: 25 }]);
  });
});
