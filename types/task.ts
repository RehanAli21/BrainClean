export interface Task {
  id: string;
  name: string;
  minimumDurationSeconds: number;
  maximumDurationSeconds: number | null;
  started: boolean;
  startedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  autoCompleted: boolean;
  userCompleted: boolean;
  createdAt: string;
}

export interface CreateTaskRequest {
  name: string;
  minimumDurationSeconds: number;
  maximumDurationSeconds?: number | null;
}
