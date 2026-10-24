import { Signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, merge, Observable, of, switchMap, tap } from 'rxjs';
import { toErrorMessage } from '../core/menu-api';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/** Server state: the last data received plus where the current request stands. */
export interface RemoteState<T> {
  data: T;
  status: LoadStatus;
  error: string | null;
}

export function initialRemoteState<T>(data: T): RemoteState<T> {
  return { data, status: 'idle', error: null };
}

type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Connects a request signal (UI state) to a server-state signal.
 *
 * Whenever `request` changes, or `reload$` emits, `fetch` is called and
 * `target` moves through loading -> success | error. `switchMap` unsubscribes
 * from the previous request, which cancels that HTTP call, so a slow, older
 * response can never overwrite a newer one. Previous data stays visible while
 * the next request is loading.
 *
 * Must be called in an injection context (for example a constructor).
 */
export function connectRemoteState<Q, T>(options: {
  request: Signal<Q>;
  reload$: Observable<void>;
  fetch: (request: Q) => Observable<T>;
  target: WritableSignal<RemoteState<T>>;
}): void {
  const { request, reload$, fetch, target } = options;

  merge(toObservable(request), reload$.pipe(map(() => request())))
    .pipe(
      tap(() => target.update((state) => ({ ...state, status: 'loading', error: null }))),
      switchMap((value) =>
        fetch(value).pipe(
          map((data): Outcome<T> => ({ ok: true, data })),
          catchError((error) => of<Outcome<T>>({ ok: false, error: toErrorMessage(error) })),
        ),
      ),
      takeUntilDestroyed(),
    )
    .subscribe((outcome) =>
      target.update((state) =>
        outcome.ok
          ? { data: outcome.data, status: 'success', error: null }
          : { ...state, status: 'error', error: outcome.error },
      ),
    );
}

/** Compares two flat objects, treating missing and `undefined` keys as equal. */
export function shallowEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}
