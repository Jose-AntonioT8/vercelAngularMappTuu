/**
 * Modelo de plan.
 *
 * Un plan agrupa actividades (por `activitiesIds`) y puede ser público/privado.
 */
export interface Plan {
  /** Identificador único del plan. */
  id: string;
  /** Nombre/título del plan. */
  name: string;
  /** IDs de actividades asociadas al plan. */
  activitiesIds: string[];
  /** Referencia/URL de imagen principal. */
  imgRef: string;
  /** ID del usuario propietario/creador. */
  ownerId: string;
  /** Fecha de creación (si la aporta backend). */
  createdAt?: Date;
  /** Media de rating del plan. */
  rating: number;
  /** Visibilidad pública. */
  visibility: boolean;
  /** Descripción larga del plan. */
  description: string;
  /** Número total de valoraciones usadas en `rating`. */
  numRatings: number;
  /** Reseñas asociadas (opcional, según endpoint). */
  reviews?: Review[];
}

/**
 * Reseña/valoración.
 *
 * Se usa tanto en planes como en actividades (dependiendo del módulo).
 */
export interface Review {
  /** ID de la reseña (si ya existe en DB). */
  id?: string;
  /** ID del usuario que publica la reseña. */
  userId: string;
  /** Puntuación del 1 al 5. */
  rating: number;
  /** Comentario textual (opcional según UX; aquí se requiere string). */
  comment: string;
  /** Fecha de creación (si la aporta backend). */
  createdAt?: Date;
}
