/**
 * Tipo/categoría de una actividad.
 *
 * Se usa para clasificar actividades y aplicar filtros en UI.
 */
export interface ActivityType {
    /** ID único del tipo. */
    id: string;
    /** Nombre visible del tipo. */
    name: string;
    /** Descripción corta para UI. */
    description: string;
    /** Color asociado (por ejemplo para badges o UI). */
      color: string;

  }
  