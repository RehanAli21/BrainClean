import {
  addBlockedAppListener,
  addServiceStoppedListener,
  getActiveSessionId,
  getBlockedApps,
  isBlocking as nativeIsBlocking,
  startBlocking as nativeStartBlocking,
  stopBlocking as nativeStopBlocking,
} from '@/modules/blocker';
import { useCallback, useEffect, useState } from 'react';

export function useBlocker() {
  const [blocking, setBlocking] = useState(() => nativeIsBlocking());
  const [blockedApps, setBlockedApps] = useState<string[]>(() => getBlockedApps());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() =>
    getActiveSessionId(),
  );

  const startBlocking = useCallback(
    (packageNames: string[], sessionId: string, authToken: string, baseUrl: string, maxBlockTimeMs: number) => {
      nativeStartBlocking(packageNames, sessionId, authToken, baseUrl, maxBlockTimeMs);
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
