import { requireNativeModule } from 'expo-modules-core';

import type { AppInfo } from '@/types/blocker';

const BlockerModule = requireNativeModule('BlockerModule');

export function getInstalledApps(): AppInfo[] {
  return BlockerModule.getInstalledApps();
}
