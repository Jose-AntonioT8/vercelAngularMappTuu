import { Activity } from "./activity.model";


export interface MapMarkerData{
  latitude: number;   // El mapa exige números
  longitude: number;
  title?: string;
  description?: string;
  link?: string;
  }