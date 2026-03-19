/**
 * Modelo de usuario de la app.
 *
 * Este modelo representa el perfil persistido en backend/DB (no necesariamente
 * coincide 1:1 con el `User` de Firebase Auth).
 */
export interface User {
  /** Email principal del usuario. */
  email: string;
  /** Identificador único del usuario (por ejemplo, UID). */
  id: string;
  /** Nombre visible del usuario. */
  name: string;
  /** Fecha de alta/creación del registro. */
  createdAt: Date;
  /** IDs de actividades guardadas por el usuario. */
  savedActivities?: string[]; // IDs de actividades guardadas por el usuario
  /** IDs de planes guardados por el usuario. */
  savedPlans?: string[]; // IDs de planes guardados por el usuario
  /** IDs de actividades creadas por el usuario. */
  createdActivities?: string[]; // IDs de actividades creadas por el usuario
  /** IDs de planes creados por el usuario. */
  createdPlans?: string[]; // IDs de planes creados por el usuario
}
