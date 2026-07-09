import { useCallback, useEffect } from 'react';

import {
  getWellnessConfig,
  setAutoBlockConfig,
  setEyeBlinkerConfig,
} from '@/modules/blocker';
import { useUiStore } from '@/store/uiStore';

export function useWellness() {
  const eyeBlinkerEnabled = useUiStore((s) => s.eyeBlinkerEnabled);
  const eyeBlinkerIntervalMinutes = useUiStore((s) => s.eyeBlinkerIntervalMinutes);
  const eyeBlinkerDurationSeconds = useUiStore((s) => s.eyeBlinkerDurationSeconds);
  const setEyeBlinkerEnabled = useUiStore((s) => s.setEyeBlinkerEnabled);
  const setEyeBlinkerIntervalMinutes = useUiStore((s) => s.setEyeBlinkerIntervalMinutes);
  const setEyeBlinkerDurationSeconds = useUiStore((s) => s.setEyeBlinkerDurationSeconds);

  const autoBlockEnabled = useUiStore((s) => s.autoBlockEnabled);
  const autoBlockUsageLimitMinutes = useUiStore((s) => s.autoBlockUsageLimitMinutes);
  const autoBlockDurationSeconds = useUiStore((s) => s.autoBlockDurationSeconds);
  const setAutoBlockEnabled = useUiStore((s) => s.setAutoBlockEnabled);
  const setAutoBlockUsageLimitMinutes = useUiStore((s) => s.setAutoBlockUsageLimitMinutes);
  const setAutoBlockDurationSeconds = useUiStore((s) => s.setAutoBlockDurationSeconds);

  const selectedApps = useUiStore((s) => s.selectedApps);

  useEffect(() => {
    try {
      const config = getWellnessConfig();
      setEyeBlinkerEnabled(config.eyeBlinkerEnabled);
      setEyeBlinkerIntervalMinutes(config.eyeBlinkerIntervalMinutes);
      setEyeBlinkerDurationSeconds(config.eyeBlinkerDurationSeconds);
      setAutoBlockEnabled(config.autoBlockEnabled);
      setAutoBlockUsageLimitMinutes(config.autoBlockUsageLimitMinutes);
      setAutoBlockDurationSeconds(config.autoBlockDurationSeconds);
    } catch {
      // Native module not available (web/iOS)
    }
  }, []);

  useEffect(() => {
    if (!autoBlockEnabled) return;
    try {
      setAutoBlockConfig(
        autoBlockEnabled,
        autoBlockUsageLimitMinutes,
        autoBlockDurationSeconds,
        selectedApps,
      );
    } catch {
      // Native module not available
    }
  }, [selectedApps]);

  const updateEyeBlinker = useCallback(
    (enabled: boolean, intervalMinutes: number, durationSeconds: number) => {
      setEyeBlinkerEnabled(enabled);
      setEyeBlinkerIntervalMinutes(intervalMinutes);
      setEyeBlinkerDurationSeconds(durationSeconds);
      try {
        setEyeBlinkerConfig(enabled, intervalMinutes, durationSeconds);
      } catch {
        // Native module not available
      }
    },
    [],
  );

  const updateAutoBlock = useCallback(
    (enabled: boolean, usageLimitMinutes: number, durationSeconds: number) => {
      setAutoBlockEnabled(enabled);
      setAutoBlockUsageLimitMinutes(usageLimitMinutes);
      setAutoBlockDurationSeconds(durationSeconds);
      try {
        setAutoBlockConfig(enabled, usageLimitMinutes, durationSeconds, selectedApps);
      } catch {
        // Native module not available
      }
    },
    [selectedApps],
  );

  return {
    eyeBlinkerEnabled,
    eyeBlinkerIntervalMinutes,
    eyeBlinkerDurationSeconds,
    autoBlockEnabled,
    autoBlockUsageLimitMinutes,
    autoBlockDurationSeconds,
    selectedAppsCount: selectedApps.length,
    updateEyeBlinker,
    updateAutoBlock,
  };
}
