import { taskService } from '@/services/api/tasks';
import type { CreateTaskRequest } from '@/types/task';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useTasksQuery(date?: string) {
  const queryDate = date ?? getTodayDate();
  return useQuery({
    queryKey: ['tasks', queryDate],
    queryFn: () => taskService.getByDate(queryDate),
  });
}

export function useTaskQuery(taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => taskService.getById(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => taskService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useStartTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.start(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });
}

export function useCompleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.complete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });
}
