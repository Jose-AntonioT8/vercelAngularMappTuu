import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

/**
 * Calcula la edad a partir de una fecha de nacimiento (ISO/string parseable).
 * @param birthDate Fecha de nacimiento.
 * @returns Edad en años completos.
 */
function calculateAgeFromBirthDate(birthDate: string): number {
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Guard de autenticación.
 *
 * Permite acceso solo si hay sesión activa; en caso contrario redirige a login.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);
  const isProfileRoute = state.url.startsWith('/profile');

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      await auth.logout();
      return false;
    }

    const profile = await firstValueFrom(userService.getUserId(uid));
    const resolvedAge = typeof profile.birthDate === 'string'
      ? calculateAgeFromBirthDate(profile.birthDate)
      : profile.age;

    // Usuarios OAuth pueden no tener perfil aún: mantener sesión y pedir completar datos.
    if (typeof resolvedAge !== 'number' || Number.isNaN(resolvedAge)) {
      if (isProfileRoute) {
        return true;
      }
      await router.navigate(['/profile/edit']);
      return false;
    }

    if (resolvedAge < 14) {
      await auth.logout();
      return false;
    }

    return true;
  } catch (error: any) {
    if (error?.message === 'User not found') {
      if (isProfileRoute) {
        return true;
      }
      await router.navigate(['/profile/edit']);
      return false;
    }
    await auth.logout();
    return false;
  }
};
