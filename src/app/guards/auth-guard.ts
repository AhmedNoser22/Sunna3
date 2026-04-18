import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login']);
  return false;
};

export const tenantGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isTenant()) return true;

  if (auth.isManager()) {
    router.navigate(['/manager-dashboard']);
    return false;
  }

  if (auth.isVendor()) {
    router.navigate(['/vendor-dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

export const managerGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isManager()) return true;

  if (auth.isTenant()) {
    router.navigate(['/dashboard']);
    return false;
  }

  if (auth.isVendor()) {
    router.navigate(['/vendor-dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

export const vendorGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isVendor()) return true;

  if (auth.isManager()) {
    router.navigate(['/manager-dashboard']);
    return false;
  }

  if (auth.isTenant()) {
    router.navigate(['/dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};