export interface Plan {
  id: string;
  name: string;
  activitiesIds: string[];
  imgRef: string;
  ownerId: string;
  rating: number;
  visibility: boolean;
  description: string,
}

