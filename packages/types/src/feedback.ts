import type { Id, IsoTimestamp } from './primitives';

export const FEEDBACK_TYPES = [
  'looks_good',
  'not_today',
  'do_not_like',
  'too_difficult',
  'takes_too_long',
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export interface RecommendationFeedback {
  id: Id;
  userId: Id;
  recipeId: Id;
  feedback: FeedbackType;
  createdAt: IsoTimestamp;
}

export interface RecommendationImpression {
  id: Id;
  userId: Id;
  recipeId: Id;
  shownAt: IsoTimestamp;
  context: 'today' | 'discover' | 'planner_suggest' | 'pantry_match';
}
