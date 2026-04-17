import { Routes } from '@angular/router';
import { authGuard, tenantGuard, managerGuard } from './guards/auth-guard';
 
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'confirm-email',
    loadComponent: () =>
      import('./pages/auth/confirm-email/confirm-email').then(
        (m) => m.ConfirmEmail
      ),
  },
  {
    path: 'create-ticket',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./pages/tenant/create-ticket/create-ticket').then(
        (m) => m.CreateTicket
      ),
  },
  {
    path: 'dashboard',
    canActivate: [tenantGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'manager-dashboard',
    canActivate: [managerGuard],
    loadComponent: () =>
      import('./pages/manager-dashboard/manager-dashboard').then(
        (m) => m.Dashboard
      ),
  },
  { path: '**', redirectTo: '' },
];