import { getActiveSessionId, isBlocking as nativeIsBlocking } from '@/modules/blocker';
import { useTaskStore } from '@/store/taskStore';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Syncs task records with the native session (see taskStore.reconcile). */
export function reconcileTasks(): void {
  try {
    useTaskStore.getState().reconcile(nativeIsBlocking(), getActiveSessionId());
  } catch {}
}

/** False until persisted tasks have loaded from AsyncStorage. */
export function useTasksHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useTaskStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useTaskStore.persist.onFinishHydration(() => setHydrated(true));
    if (useTaskStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}

/**
 * Reconciles once tasks have loaded and on every app foreground, so a session
 * that ended while the app was closed (max time reached) shows as completed.
 */
export function useTaskReconcile(): void {
  const hydrated = useTasksHydrated();

  useEffect(() => {
    if (!hydrated) return;
    reconcileTasks();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcileTasks();
    });
    return () => sub.remove();
  }, [hydrated]);
}
