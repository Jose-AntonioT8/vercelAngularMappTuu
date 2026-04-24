import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

/**
 * Guard de autenticación.
 *
 * Permite acceso solo si hay sesión activa; en caso contrario redirige al landing.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);

  if (!auth.isAuthenticated()) {
    router.navigate(['/landingPage']);
    return false;
  }

  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      await auth.logout();
      return false;
    }

    const profile = await firstValueFrom(userService.getUserId(uid));
    if (typeof profile.age === 'number' && profile.age < 14) {
      await auth.logout();
      return false;
    }

    return true;
  } catch {
    await auth.logout();
    return false;
  }
};
