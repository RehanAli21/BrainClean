import type { SubscriptionStatus, VerifyReceiptRequest, VerifyReceiptResponse } from '@/types/subscription';
import apiClient from './client';

export const subscriptionService = {
  verify: async (data: VerifyReceiptRequest): Promise<VerifyReceiptResponse> => {
    const response = await apiClient.post<VerifyReceiptResponse>('/subscriptions/verify', data);
    return response.data;
  },

  getStatus: async (): Promise<SubscriptionStatus> => {
    const response = await apiClient.get<SubscriptionStatus>('/subscriptions/status');
    return response.data;
  },
};
