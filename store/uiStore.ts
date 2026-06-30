import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const secureStorage: StateStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

interface UiState {
  selectedApps: string[];
  toggleApp: (packageName: string) => void;
  isAppSelected: (packageName: string) => boolean;
  blockNotifications: boolean;
  setBlockNotifications: (enabled: boolean) => void;
  // Timestamp (ms) the user confirmed they padlocked BrainClean in the recents
  // view on an aggressive-OEM device (XOS/MIUI/etc). Null = not confirmed yet.
  // Used to hide the padlock-tutorial card once the user has done it.
  padlockConfirmedAt: number | null;
  setPadlockConfirmed: (confirmed: boolean) => void;
  tutorialSeen: boolean;
  setTutorialSeen: (seen: boolean) => void;
  hasRated: boolean;
  setHasRated: (rated: boolean) => void;
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

      blockNotifications: false,

      setBlockNotifications: (enabled: boolean) => {
        set({ blockNotifications: enabled });
      },

      padlockConfirmedAt: null,

      setPadlockConfirmed: (confirmed: boolean) => {
        set({ padlockConfirmedAt: confirmed ? Date.now() : null });
      },

      tutorialSeen: false,

      setTutorialSeen: (seen: boolean) => {
        set({ tutorialSeen: seen });
      },

      hasRated: false,

      setHasRated: (rated: boolean) => {
        set({ hasRated: rated });
      },
    }),
    {
      name: 'brainclean-ui',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
