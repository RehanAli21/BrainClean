import { hasRequiredPermissions } from '@/modules/blocker';
import type { PermissionStatus } from '@/types/blocker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  const check = useCallback(() => {
    try {
      const status = hasRequiredPermissions();
      setPermissions(status);
    } catch {
      setPermissions({ usageStats: false, overlay: false, batteryOptimization: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Re-check when app returns from background (user comes back from Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        check();
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [check]);

  const allGranted =
    permissions?.usageStats === true &&
    permissions?.overlay === true &&
    permissions?.batteryOptimization === true;

  return { permissions, isLoading, allGranted, recheck: check };
}
