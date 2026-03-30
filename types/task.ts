export interface Task {
  id: string;
  name: string;
  minimumDurationSeconds: number;
  started: boolean;
  startedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateTaskRequest {
  name: string;
  minimumDurationSeconds: number;
}
