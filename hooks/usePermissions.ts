import { hasRequiredPermissions } from '@/modules/blocker';
import type { PermissionStatus } from '@/types/blocker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

// Android 13+ hides a foreground service's notification unless POST_NOTIFICATIONS
// is granted, and a notification posted while denied is not shown after a later
// grant. Ask before starting a service. Optional: services run either way, so a
// denial or error is ignored. Once denied twice, Android stops showing the dialog.
export async function ensureNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  try {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(permission)) return;
    await PermissionsAndroid.request(permission);
  } catch {}
}

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
