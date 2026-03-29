import type { CreateTaskRequest, Task } from '@/types/task';
import apiClient from './client';

export const taskService = {

  getAll: async (): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks');
    return response.data;
  },

  getById: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  create: async (data: CreateTaskRequest): Promise<Task> => {
    const response = await apiClient.post<Task>('/tasks', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },

  complete: async (id: string): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/tasks/${id}/complete`);
    return response.data;
  },
};
