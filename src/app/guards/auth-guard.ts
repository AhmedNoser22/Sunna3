import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const tenantGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isTenant()) return true;
  if (auth.isManager()) return router.createUrlTree(['/manager-dashboard']);
  if (auth.isVendor()) return router.createUrlTree(['/vendor-dashboard']);
  return router.createUrlTree(['/login']);
};

export const managerGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isManager()) return true;
  if (auth.isTenant()) return router.createUrlTree(['/dashboard']);
  if (auth.isVendor()) return router.createUrlTree(['/vendor-dashboard']);
  return router.createUrlTree(['/login']);
};

export const vendorGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isVendor()) return true;
  if (auth.isManager()) return router.createUrlTree(['/manager-dashboard']);
  if (auth.isTenant()) return router.createUrlTree(['/dashboard']);
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;
  if (auth.isManager()) return router.createUrlTree(['/manager-dashboard']);
  if (auth.isVendor()) return router.createUrlTree(['/vendor-dashboard']);
  return router.createUrlTree(['/dashboard']);
};