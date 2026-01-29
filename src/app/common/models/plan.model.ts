export interface Plan {
  id: string;
  name: string;
  activitiesIds: string[];
  imgRef: string;
  ownerId: string;
  createdAt?: Date;
  rating: number;
  visibility: boolean;
  description: string;
  numRatings: number;
  reviews?: Review[];
}

export interface Review {
  id?: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt?: Date;
}
