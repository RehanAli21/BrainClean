import type { FeedbackResponse, SubmitFeedbackRequest } from '@/types/feedback';
import apiClient from './client';

export const feedbackService = {
  submit: async (data: SubmitFeedbackRequest): Promise<FeedbackResponse> => {
    const response = await apiClient.post<FeedbackResponse>('/feedback', data);
    return response.data;
  },
};
