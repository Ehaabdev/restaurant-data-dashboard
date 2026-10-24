import { FormControl } from '@angular/forms';
import { maxDecimals } from './validators';

describe('maxDecimals', () => {
  const validate = (value: number | null) => maxDecimals(2)(new FormControl(value));

  it('accepts whole numbers and up to two decimals', () => {
    expect(validate(12)).toBeNull();
    expect(validate(12.5)).toBeNull();
    expect(validate(0.1 + 0.2)).toBeNull(); // 0.30000000000000004 is still a valid price
    expect(validate(null)).toBeNull();
  });

  it('rejects more than two decimals', () => {
    expect(validate(12.345)).toEqual({ maxDecimals: { places: 2 } });
  });
});
