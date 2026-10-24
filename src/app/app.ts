import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <mat-icon class="logo" aria-hidden="true">restaurant</mat-icon>
      <span class="brand">Restaurant Data</span>
      <nav class="nav">
        <a mat-button routerLink="/dashboard" routerLinkActive="active">
          <mat-icon>dashboard</mat-icon>Dashboard
        </a>
        <a mat-button routerLink="/menu" routerLinkActive="active">
          <mat-icon>table_rows</mat-icon>Menu Explorer
        </a>
      </nav>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      gap: 8px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .logo {
      color: var(--mat-sys-primary);
    }
    .brand {
      font: var(--mat-sys-title-medium);
      margin-right: 16px;
    }
    .nav {
      display: flex;
      gap: 4px;
    }
    .nav .active {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    @media (max-width: 600px) {
      .brand {
        display: none;
      }
    }
  `,
})
export class App {}
