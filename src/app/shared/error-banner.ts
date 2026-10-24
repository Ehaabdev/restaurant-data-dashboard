import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-banner',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" role="alert">
      <mat-icon aria-hidden="true">error_outline</mat-icon>
      <span class="message">{{ message() }}</span>
      <button mat-button type="button" (click)="retry.emit()">Retry</button>
    </div>
  `,
  styles: `
    .banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 8px 8px 16px;
      margin-bottom: 16px;
      border-radius: 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .message {
      flex: 1;
    }
  `,
})
export class ErrorBanner {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}
