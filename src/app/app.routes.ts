import { Routes } from '@angular/router';
import { authGuard, tenantGuard, managerGuard, vendorGuard, guestGuard } from './guards/auth-guard';
import { PaymentCallback } from './pages/payment-callback/payment-callback';

export const routes: Routes = [
  {
    path: '',
    canActivate: [guestGuard], 
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    canActivate: [guestGuard], 
    loadComponent: () =>
      import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard], //
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
    path: 'vendor-register',
    loadComponent: () =>
      import('./pages/auth/vendor-register/vendor-register').then(
        (m) => m.VendorRegister
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
        (m) => m.ManagerDashboard
      ),
  },
  {
    path: 'payment/callback',
    component: PaymentCallback,
  },
  {
    path: 'vendor-dashboard',
    canActivate: [vendorGuard],
    loadComponent: () =>
      import('./pages/vendor-dashboard/vendor-dashboard').then(
        (m) => m.VendorDashboard
      ),
  },
  {
    path: 'vendor-profile/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/vedorprofile/vedorprofile').then(
        (m) => m.VendorProfile
      ),
  },
  { path: '**', redirectTo: '' },
];