import { Activity } from "./activity.model";



export interface ActivityDetail extends Activity {
    description: string;
    price: number;
    openingHours: { day: string, hours: string }[];
    contactEmail: string;
    fullMapData: any; // Aquí irían datos complejos como coordenadas, etc.
    highlights: string[];
}