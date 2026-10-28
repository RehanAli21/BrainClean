import type { ThemeMode } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

// Nothing in this store is a secret, and
// SecureStore is slow and warns above 2048 bytes — which a long selectedApps
// list exceeds. AsyncStorage is the right home; existing installs migrate
// their SecureStore blob on first read.
const storage: StateStorage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    if (value != null) return value;
    try {
      const legacy = await SecureStore.getItemAsync(name);
      if (legacy != null) {
        await AsyncStorage.setItem(name, legacy);
        await SecureStore.deleteItemAsync(name);
        return legacy;
      }
    } catch {}
    return null;
  },
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

interface UiState {
  selectedApps: string[];
  toggleApp: (packageName: string) => void;
  isAppSelected: (packageName: string) => boolean;
  // Timestamp (ms) the user confirmed they padlocked BrainClean in the recents
  // view on an aggressive-OEM device (XOS/MIUI/etc). Null = not confirmed yet.
  // Used to hide the padlock-tutorial card once the user has done it.
  padlockConfirmedAt: number | null;
  setPadlockConfirmed: (confirmed: boolean) => void;
  tutorialSeen: boolean;
  setTutorialSeen: (seen: boolean) => void;
  // True once the user has completed the first-launch permission wizard.
  setupCompleted: boolean;
  setSetupCompleted: (completed: boolean) => void;
  hasRated: boolean;
  setHasRated: (rated: boolean) => void;
  selectedLanguage: string | null;
  setSelectedLanguage: (language: string) => void;
  eyeBlinkerEnabled: boolean;
  setEyeBlinkerEnabled: (enabled: boolean) => void;
  eyeBlinkerIntervalMinutes: number;
  setEyeBlinkerIntervalMinutes: (minutes: number) => void;
  eyeBlinkerDurationSeconds: number;
  setEyeBlinkerDurationSeconds: (seconds: number) => void;
  autoBlockEnabled: boolean;
  setAutoBlockEnabled: (enabled: boolean) => void;
  autoBlockUsageLimitMinutes: number;
  setAutoBlockUsageLimitMinutes: (minutes: number) => void;
  autoBlockDurationSeconds: number;
  setAutoBlockDurationSeconds: (seconds: number) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // Global custom messages for the two wellness overlays. Empty = built-in
  // default. Pushed to the Kotlin overlays via useNativeSync.
  customMessageEye: string;
  setCustomMessageEye: (message: string) => void;
  customMessageAppMonitor: string;
  setCustomMessageAppMonitor: (message: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      selectedApps: [],

      toggleApp: (packageName: string) => {
        const current = get().selectedApps;
        if (current.includes(packageName)) {
          set({ selectedApps: current.filter((p) => p !== packageName) });
        } else {
          set({ selectedApps: [...current, packageName] });
        }
      },

      isAppSelected: (packageName: string) => {
        return get().selectedApps.includes(packageName);
      },

      padlockConfirmedAt: null,

      setPadlockConfirmed: (confirmed: boolean) => {
        set({ padlockConfirmedAt: confirmed ? Date.now() : null });
      },

      tutorialSeen: false,

      setTutorialSeen: (seen: boolean) => {
        set({ tutorialSeen: seen });
      },

      setupCompleted: false,

      setSetupCompleted: (completed: boolean) => {
        set({ setupCompleted: completed });
      },

      hasRated: false,

      setHasRated: (rated: boolean) => {
        set({ hasRated: rated });
      },

      selectedLanguage: null,

      setSelectedLanguage: (language: string) => {
        set({ selectedLanguage: language });
      },

      eyeBlinkerEnabled: false,
      setEyeBlinkerEnabled: (enabled: boolean) => {
        set({ eyeBlinkerEnabled: enabled });
      },
      eyeBlinkerIntervalMinutes: 20,
      setEyeBlinkerIntervalMinutes: (minutes: number) => {
        set({ eyeBlinkerIntervalMinutes: minutes });
      },
      eyeBlinkerDurationSeconds: 20,
      setEyeBlinkerDurationSeconds: (seconds: number) => {
        set({ eyeBlinkerDurationSeconds: seconds });
      },

      autoBlockEnabled: false,
      setAutoBlockEnabled: (enabled: boolean) => {
        set({ autoBlockEnabled: enabled });
      },
      autoBlockUsageLimitMinutes: 15,
      setAutoBlockUsageLimitMinutes: (minutes: number) => {
        set({ autoBlockUsageLimitMinutes: minutes });
      },
      autoBlockDurationSeconds: 30,
      setAutoBlockDurationSeconds: (seconds: number) => {
        set({ autoBlockDurationSeconds: seconds });
      },

      themeMode: 'system' as ThemeMode,
      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode });
      },

      customMessageEye: '',
      setCustomMessageEye: (message: string) => {
        set({ customMessageEye: message });
      },
      customMessageAppMonitor: '',
      setCustomMessageAppMonitor: (message: string) => {
        set({ customMessageAppMonitor: message });
      },
    }),
    {
      name: 'brainclean-ui',
      storage: createJSONStorage(() => storage),
    },
  ),
);
