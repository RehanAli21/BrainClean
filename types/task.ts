// Tasks live only on the device (store/taskStore.ts). The Kotlin blocker
// session is the enforcement; a task is just its record and history.
export interface Task {
  id: string;
  name: string;
  minimumDurationSeconds: number;
  maximumDurationSeconds: number | null;
  // 0 = off, 1 = blocked apps only, 2 = all. Applied when the task starts.
  notificationBlockMode: number;
  // Block-screen message for this task. Empty = native default.
  customMessage: string;
  started: boolean;
  startedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  autoCompleted: boolean;
  createdAt: string;
}

export interface CreateTaskInput {
  name: string;
  minimumDurationSeconds: number;
  maximumDurationSeconds: number | null;
  notificationBlockMode: number;
  customMessage: string;
}
