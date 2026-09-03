import type { Id, IsoTimestamp, Url } from './primitives';

export interface ProviderTermsReview {
  id: Id;
  providerId: Id;
  reviewedBy: string;
  reviewedAt: IsoTimestamp;
  termsUrl: Url;
  termsVersion?: string;
  allowsStorage: boolean;
  allowsModification: boolean;
  allowsCommercialUse: boolean;
  requiresAttribution: boolean;
  notes?: string;
}

export interface ProviderConfig {
  id: Id;
  key: 'themealdb' | 'spoonacular' | 'edamam' | (string & {});
  displayName: string;
  enabled: boolean;
  /** True when the required env credentials are present. */
  hasCredentials: boolean;
  lastTermsReviewId?: Id;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
