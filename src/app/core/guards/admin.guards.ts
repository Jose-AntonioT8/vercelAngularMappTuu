import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de administrador.
 *
 * Permite acceso solo a usuarios autenticados con rol admin.
 * Si falla, redirige al dashboard.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  } else {
    router.navigate(['/dashboard']);
    return false;
  }
};
