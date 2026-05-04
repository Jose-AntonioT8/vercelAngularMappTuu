/**
 * Reseña de una actividad.
 *
 * Se asocia típicamente a un usuario (por `userId`) e incluye puntuación,
 * comentario y fecha de creación.
 */
export interface Review {
  /** ID de la reseña (si viene de backend/Firestore). */
  id?: string;
  /** ID del usuario autor de la reseña. */
  userId: string;
  /** Nombre del usuario autor de la reseña (se resuelve desde el servicio). */
  userName?: string;
  /** Puntuación numérica (por ejemplo 1-5). */
  rating: number;
  /** Comentario de texto libre. */
  comment: string;
  /** Fecha de creación (si está disponible). */
  createdAt?: Date;
}

/** Estados de moderación de actividad expuestos por backend. */
export type ActivityModerationStatus =
  | 'approved'
  | 'pending_review'
  | 'rejected';

/** Resultado de moderación que frontend envía en create/update. */
export interface ActivityModerationResult {
  blocked: boolean;
  warning: boolean;
  score: number;
  reasons: string[];
}

/**
 * Modelo base de Actividad usado por la UI.
 *
 * Nota: en algunas pantallas se extiende (ver `ActivityDetail`) para incluir
 * campos adicionales (descripción, precio, etc.).
 */
export interface Activity {
  /** Fecha de creación (si la fuente de datos la aporta). */
  createdAt?: Date;
  /** ID único de la actividad. */
  id: string;
  /** Nombre visible de la actividad. */
  name: string;
  /** URL de imagen principal. */
  imageURL: string;
  /** Indicador de favorito en UI (puede ser derivado por usuario). */
  favorite: boolean;
  /** ID del tipo de actividad asociado. */
  IdTypeActivity: string;
  /** Longitud en formato string (por compatibilidad con formularios/UI). */
  longitude: string;
  /** Latitud en formato string (por compatibilidad con formularios/UI). */
  latitude: string;
  /** Rating agregado de la actividad. */
  rating: number;
  /** Número total de valoraciones usadas para `rating`. */
  numRatings: number;
  /** Lista de reseñas, si se carga junto a la actividad. */
  reviews?: Review[];
  /** Estado de moderación de la actividad. */
  moderationStatus?: ActivityModerationStatus;
  /** Score numérico de moderación. */
  moderationScore?: number | null;
  /** Motivos detectados por la moderación. */
  moderationReasons?: string[];
  /** Fecha de moderación (si existe). */
  moderatedAt?: string | number | Date | null;
  /** ID del admin/moderador que tomó decisión manual. */
  moderatedBy?: string | null;
}
