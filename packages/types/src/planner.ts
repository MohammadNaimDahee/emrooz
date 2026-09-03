import type { Id, IsoDate, IsoTimestamp } from './primitives';
import type { MealType } from './recipe';

export interface MealPlanEntry {
  id: Id;
  userId: Id;
  date: IsoDate;
  meal: Extract<MealType, 'breakfast' | 'lunch' | 'dinner'>;
  recipeId: Id;
  servings: number;
  createdAt: IsoTimestamp;
}
