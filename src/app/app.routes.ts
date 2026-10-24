import { Routes } from '@angular/router';

/** Each page is lazy loaded, so its code is only downloaded when it is first opened. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard Overview',
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'menu',
    title: 'Menu Data Explorer',
    loadComponent: () =>
      import('./features/menu-explorer/menu-explorer-page').then((m) => m.MenuExplorerPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
