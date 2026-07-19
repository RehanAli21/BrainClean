import { API_BASE_URL } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { syncLocalizedStrings, syncScheduleConfig } from '@/modules/blocker';
import { useUiStore } from '@/store/uiStore';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

/**
 * Keeps the Kotlin layer's persisted config fresh:
 * - schedule auth config (token/base URL/apps), so alarms that fire days later
 *   use the most recent token instead of one frozen at schedule creation
 * - localized strings for native overlays and notifications
 * Runs on mount, on every app foreground, and when inputs change.
 */
export function useNativeSync() {
  const { token } = useAuth();
  const selectedApps = useUiStore(s => s.selectedApps);
  const notificationBlockMode = useUiStore(s => s.notificationBlockMode);
  const { t, i18n } = useTranslation();

  const sync = useCallback(() => {
    try {
      if (token) {
        syncScheduleConfig(token, API_BASE_URL, selectedApps, notificationBlockMode);
      }
      syncLocalizedStrings({
        'blocker.notifText': t('native.blockerNotifText'),
        'blocker.overlayTitle': t('native.overlayTitle'),
        'blocker.overlaySubtitle': t('native.overlaySubtitle'),
        'wellness.notifEye': t('native.wellnessNotifEye'),
        'wellness.notifAutoBlock': t('native.wellnessNotifAutoBlock'),
        'wellness.notifBoth': t('native.wellnessNotifBoth'),
        'wellness.eyeTitle': t('native.eyeTitle'),
        'wellness.eyeSubtitle': t('native.eyeSubtitle'),
        'wellness.breakTitle': t('native.breakTitle'),
        'wellness.breakSubtitle': t('native.breakSubtitle'),
        'schedule.startedTitle': t('native.scheduleStartedTitle'),
        'schedule.startedText': t('native.scheduleStartedText'),
        'schedule.failedTitle': t('native.scheduleFailedTitle'),
        'schedule.failedAuth': t('native.scheduleFailedAuth'),
        'schedule.failedSubscription': t('native.scheduleFailedSubscription'),
        'schedule.failedGeneric': t('native.scheduleFailedGeneric'),
      });
    } catch {}
    // i18n.language ensures a re-sync when the user switches languages
  }, [token, selectedApps, notificationBlockMode, t, i18n.language]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);
}
