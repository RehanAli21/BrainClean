export interface Task {
  id: string;
  name: string;
  minimumDurationSeconds: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateTaskRequest {
  name: string;
  minimumDurationSeconds: number;
}
