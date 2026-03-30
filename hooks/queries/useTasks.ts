import { taskService } from '@/services/api/tasks';
import type { CreateTaskRequest } from '@/types/task';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useTasksQuery() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getAll,
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
    onSuccess: () => {
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
