export const EDITORIAL_STATES = [
  'draft',
  'imported',
  'needs_review',
  'reviewed',
  'published',
  'rejected',
  'archived',
] as const;
export type EditorialState = (typeof EDITORIAL_STATES)[number];

export const AUTHENTICITY_REVIEW_STATES = [
  'unreviewed',
  'family_reviewed',
  'community_reviewed',
  'expert_reviewed',
] as const;
export type AuthenticityReviewState = (typeof AUTHENTICITY_REVIEW_STATES)[number];

export function isPubliclyVisible(state: EditorialState): boolean {
  return state === 'published';
}
