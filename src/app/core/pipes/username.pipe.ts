import { Pipe, PipeTransform } from '@angular/core';
import { UserService } from '../services/user.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Pipe para resolver el nombre de usuario a partir de su ID.
 *
 * Uso en template: `{{ userId | userName | async }}`
 *
 * Incluye caché para evitar consultas repetidas.
 */
@Pipe({
  name: 'userName',
  standalone: true
})
export class UserNamePipe implements PipeTransform {
  /** Caché de nombres de usuario por ID */
  private cache: Map<string, string> = new Map();

  constructor(private userService: UserService) {}

  /**
   * Transforma un userId en el nombre del usuario.
   * @param userId ID del usuario
   * @returns Observable con el nombre del usuario o el ID si no se puede resolver
   */
  transform(userId: string): Observable<string> {
    if (!userId) {
      return of('Anónimo');
    }

    // Si está en caché, devolver inmediatamente
    if (this.cache.has(userId)) {
      return of(this.cache.get(userId)!);
    }

    // Resolver desde el servicio
    return this.userService.getUserId(userId).pipe(
      map((user: any) => {
        const userName = user.name || user.email?.split('@')[0] || userId;
        this.cache.set(userId, userName);
        console.log(`✅ Usuario resuelto por pipe: ${userId} -> ${userName}`);
        return userName;
      }),
      catchError((err) => {
        console.warn(`❌ Error resolviendo usuario ${userId}:`, err);
        this.cache.set(userId, userId);
        return of(userId);
      })
    );
  }
}
