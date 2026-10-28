import type { CreateTaskInput, Task } from '@/types/task';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Tasks are stored only on the device. This store is the task history; the
// Kotlin BlockerState is still the source of truth for whether blocking is
// active, and reconcile() brings the two back in line when they disagree.

/** Session cap used when a task has no auto-complete time (matches native). */
export const DEFAULT_MAX_BLOCK_SECONDS = 36_000;

function makeId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isTaskActive(task: Task): boolean {
  return task.started && !task.completed;
}

/** Max session length in ms for a task, as passed to the native blocker. */
export function maxBlockTimeMs(task: Task): number {
  return (task.maximumDurationSeconds ?? DEFAULT_MAX_BLOCK_SECONDS) * 1000;
}

interface TaskState {
  tasks: Task[];
  addTask: (input: CreateTaskInput) => Task;
  deleteTask: (id: string) => void;
  markStarted: (id: string) => void;
  markCompleted: (id: string) => void;
  // Marks any active task whose native session is gone (max time reached,
  // ended while the app was closed) as auto-completed.
  reconcile: (nativeBlocking: boolean, nativeSessionId: string | null) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (input: CreateTaskInput) => {
        const task: Task = {
          ...input,
          id: makeId(),
          started: false,
          startedAt: null,
          completed: false,
          completedAt: null,
          autoCompleted: false,
          createdAt: new Date().toISOString(),
        };
        set({ tasks: [task, ...get().tasks] });
        return task;
      },

      deleteTask: (id: string) => {
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
      },

      markStarted: (id: string) => {
        const now = new Date().toISOString();
        set({
          tasks: get().tasks.map((t) => (t.id === id ? { ...t, started: true, startedAt: now } : t)),
        });
      },

      markCompleted: (id: string) => {
        const now = new Date().toISOString();
        set({
          tasks: get().tasks.map((t) =>
            t.id === id ? { ...t, completed: true, completedAt: now, autoCompleted: false } : t,
          ),
        });
      },

      reconcile: (nativeBlocking: boolean, nativeSessionId: string | null) => {
        const now = Date.now();
        let changed = false;
        const tasks = get().tasks.map((t) => {
          if (!isTaskActive(t)) return t;
          if (nativeBlocking && nativeSessionId === t.id) return t;
          changed = true;
          // The session ended without the user finishing it: at its max time,
          // or earlier if the session was lost. Never claim a time in the future.
          const endsAt = new Date(t.startedAt!).getTime() + maxBlockTimeMs(t);
          return {
            ...t,
            completed: true,
            completedAt: new Date(Math.min(now, endsAt)).toISOString(),
            autoCompleted: true,
          };
        });
        if (changed) set({ tasks });
      },
    }),
    {
      name: 'brainclean-tasks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);
