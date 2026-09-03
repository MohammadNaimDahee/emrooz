import type { Id, IsoTimestamp } from './primitives';
import type { Unit } from './ingredient';

export interface ShoppingListItem {
  id: Id;
  userId: Id;
  ingredientId?: Id;
  /** Free-text label for manually added items that are not in the ingredient catalogue. */
  label?: string;
  quantity?: number;
  unit?: Unit;
  /** Which recipes contributed this item, if any. */
  sourceRecipeIds: Id[];
  checked: boolean;
  addedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
