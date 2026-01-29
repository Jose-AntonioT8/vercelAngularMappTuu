export interface Review {
  id?: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt?: Date;
}

export interface Activity {
  createdAt?: Date;
  id: string;
  name: string;
  imageURL: string;
  favorite: boolean;
  IdTypeActivity: string;
  longitude: string;
  latitude: string;
  rating: number;
  numRatings: number;
  reviews?: Review[];
}
