import { ValidatorFn } from '@angular/forms';

/** Fails when a number has more decimal places than allowed (e.g. 4.999 for prices). */
export function maxDecimals(places: number): ValidatorFn {
  const factor = 10 ** places;
  return (control) => {
    const value = control.value;
    if (typeof value !== 'number') return null;
    return Math.abs(value * factor - Math.round(value * factor)) > 1e-6
      ? { maxDecimals: { places } }
      : null;
  };
}
