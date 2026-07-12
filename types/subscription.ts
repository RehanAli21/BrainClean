export type SubscriptionState =
  | 'NONE'
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'IN_GRACE_PERIOD'
  | 'ON_HOLD'
  | 'CANCELED'
  | 'EXPIRED';

export interface SubscriptionStatus {
  state: SubscriptionState;
  hasAccess: boolean;
  inTrial: boolean;
  autoRenewing: boolean;
  productId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
}

export type VerifyReceiptResponse = SubscriptionStatus;

export interface VerifyReceiptRequest {
  purchaseToken: string;
  productId: string;
}
