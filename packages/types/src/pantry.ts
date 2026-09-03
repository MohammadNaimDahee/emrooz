import type { Id, IsoTimestamp } from './primitives';
import type { Unit } from './ingredient';

export interface PantryItem {
  id: Id;
  userId: Id;
  ingredientId: Id;
  quantity?: number;
  unit?: Unit;
  addedAt: IsoTimestamp;
}
