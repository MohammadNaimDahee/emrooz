import type { Id, IsoDate, IsoTimestamp } from './primitives';

export interface CookingHistoryEntry {
  id: Id;
  userId: Id;
  recipeId: Id;
  cookedOn: IsoDate;
  servings: number;
  note?: string;
  createdAt: IsoTimestamp;
}

export interface FavoriteEntry {
  id: Id;
  userId: Id;
  recipeId: Id;
  favoritedAt: IsoTimestamp;
}
