import { syncLocalizedStrings } from '@/modules/blocker';
import { useUiStore } from '@/store/uiStore';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

/**
 * Keeps the Kotlin layer's localized strings (native overlays and
 * notifications) fresh. Runs on mount, on every app foreground, and when
 * inputs change.
 */
export function useNativeSync() {
  const customMessageEye = useUiStore(s => s.customMessageEye);
  const customMessageAppMonitor = useUiStore(s => s.customMessageAppMonitor);
  const { t, i18n } = useTranslation();

  const sync = useCallback(() => {
    try {
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
        // Global wellness custom messages (empty string = native default).
        'custom.eye': customMessageEye,
        'custom.appMonitor': customMessageAppMonitor,
      });
    } catch {}
    // i18n.language ensures a re-sync when the user switches languages
  }, [customMessageEye, customMessageAppMonitor, t, i18n.language]);

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
