import {
  addBlockedAppListener,
  addServiceStoppedListener,
  getActiveSessionId,
  getBlockedApps,
  isBlocking as nativeIsBlocking,
  startBlocking as nativeStartBlocking,
  stopBlocking as nativeStopBlocking,
} from '@/modules/blocker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export function useBlocker() {
  const [blocking, setBlocking] = useState(() => nativeIsBlocking());
  const [blockedApps, setBlockedApps] = useState<string[]>(() => getBlockedApps());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() =>
    getActiveSessionId(),
  );

  const startBlocking = useCallback(
    (packageNames: string[], sessionId: string, authToken: string, baseUrl: string, maxBlockTimeMs: number, blockNotifications: boolean, minimumDurationMs: number) => {
      nativeStartBlocking(packageNames, sessionId, authToken, baseUrl, maxBlockTimeMs, blockNotifications, minimumDurationMs);
      setBlocking(true);
      setBlockedApps(packageNames);
      setActiveSessionId(sessionId);
    },
    [],
  );

  const stopBlocking = useCallback(() => {
    nativeStopBlocking();
    setBlocking(false);
    setBlockedApps([]);
    setActiveSessionId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const actual = nativeIsBlocking();
      if (actual !== blocking) {
        setBlocking(actual);
        if (actual) {
          setBlockedApps(getBlockedApps());
          setActiveSessionId(getActiveSessionId());
        } else {
          setBlockedApps([]);
          setActiveSessionId(null);
        }
      }
    }, [blocking]),
  );

  useEffect(() => {
    const blockedSub = addBlockedAppListener((_event) => {
      // Overlay is handled natively; this is for future RN-side reactions
    });

    const stoppedSub = addServiceStoppedListener(() => {
      setBlocking(false);
      setBlockedApps([]);
      setActiveSessionId(null);
    });

    return () => {
      blockedSub.remove();
      stoppedSub.remove();
    };
  }, []);

  return {
    isBlocking: blocking,
    blockedApps,
    activeSessionId,
    startBlocking,
    stopBlocking,
  };
}
