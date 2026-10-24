import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type KpiTone = 'primary' | 'success' | 'warning' | 'neutral';

@Component({
  selector: 'app-kpi-card',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="kpi surface-card">
      <span class="icon" [class]="tone()" aria-hidden="true">
        <mat-icon>{{ icon() }}</mat-icon>
      </span>
      <div>
        <p class="label">{{ label() }}</p>
        <p class="value">{{ value() }}</p>
        @if (hint()) {
          <p class="hint">{{ hint() }}</p>
        }
      </div>
    </article>
  `,
  styles: `
    .kpi {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px;
      height: 100%;
      box-sizing: border-box;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .primary {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .success {
      background: #dff5e3;
      color: #1b5e20;
    }
    .warning {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .neutral {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    p {
      margin: 0;
    }
    .label {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }
    .value {
      margin-top: 4px;
      font: var(--mat-sys-headline-medium);
      font-variant-numeric: tabular-nums;
    }
    .hint {
      margin-top: 2px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<string>();
  readonly tone = input<KpiTone>('primary');
  readonly hint = input<string>();
}
