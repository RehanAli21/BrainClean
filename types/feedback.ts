export const FEEDBACK_CATEGORIES = [
  'hard-to-use',
  'missing-features',
  'too-many-permissions',
  'not-what-expected',
  'found-alternative',
  'bugs-crashes',
  'privacy-concerns',
  'other',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface SubmitFeedbackRequest {
  category: FeedbackCategory;
  message: string;
  email?: string;
}

export interface FeedbackResponse {
  id: string;
  category: FeedbackCategory;
  message: string;
  email: string | null;
  createdAt: string;
}
