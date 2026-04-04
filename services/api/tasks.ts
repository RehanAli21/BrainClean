import type { CreateTaskRequest, Task } from '@/types/task';
import apiClient from './client';

export const taskService = {

  getByDate: async (date: string): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks/by-date', { params: { date } });
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

  start: async (id: string): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/tasks/${id}/start`);
    return response.data;
  },
};
