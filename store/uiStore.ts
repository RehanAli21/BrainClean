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
  maxBlockTimeMinutes: number;
  setMaxBlockTime: (minutes: number) => void;
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

      maxBlockTimeMinutes: 600,

      setMaxBlockTime: (minutes: number) => {
        set({ maxBlockTimeMinutes: minutes });
      },
    }),
    {
      name: 'brainclean-ui',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
