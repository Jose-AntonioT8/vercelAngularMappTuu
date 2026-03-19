import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de “invitado”.
 *
 * Evita acceder a rutas de guest-only (login/signup) si ya hay sesión activa.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }
  router.navigate(['/landingPage']);
  return false;
};
