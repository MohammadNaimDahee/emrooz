import type { Id, IsoTimestamp } from './primitives';
import type { Locale } from './locale';
import type { Allergen, DietaryTag } from './ingredient';
import type { Difficulty } from './recipe';

export type HouseholdSize = number;

export interface DailyReminder {
  enabled: boolean;
  /** "HH:mm" 24h local time */
  time: string;
}

/**
 * User preferences captured through onboarding and settings.
 * Allergies and strict dietary restrictions are treated as hard filters
 * downstream and are never merely ranking hints. See CLAUDE.md §15, §17.
 */
export interface UserPreferences {
  userId: Id;
  language: Locale;
  cuisineIds: Id[];
  householdSize: HouseholdSize;
  maxCookMinutes?: number;
  dietaryTags: DietaryTag[];
  allergens: Allergen[];
  dislikedIngredientIds: Id[];
  pantrySeedIngredientIds: Id[];
  preferredDifficulty?: Difficulty;
  reminder?: DailyReminder;
  onboardedAt?: IsoTimestamp;
}

export type GuestId = string;

export interface UserProfile {
  id: Id;
  /** Present for registered users, absent for guests. */
  email?: string;
  isGuest: boolean;
  displayName?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
