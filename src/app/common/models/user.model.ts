export interface User {
  email: string;
  name: string;
  createdAt: Date;
  savedActivities?: string[]; // IDs de actividades guardadas por el usuario
  savedPlans?: string[]; // IDs de planes guardados por el usuario
  createdActivities?: string[]; // IDs de actividades creadas por el usuario
  createdPlans?: string[]; // IDs de planes creados por el usuario
}
