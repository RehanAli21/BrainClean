import apiClient from './client';

export const userService = {
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/users/me');
  },
};
