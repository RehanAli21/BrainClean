import { EventEmitter, requireNativeModule, type Subscription } from 'expo-modules-core';

import type { AppInfo, PermissionStatus } from '@/types/blocker';

const BlockerModule = requireNativeModule('BlockerModule');
const emitter = new EventEmitter(BlockerModule);

export function getInstalledApps(): AppInfo[] {
  return BlockerModule.getInstalledApps();
}

export function startBlocking(packageNames: string[], sessionId: string): void {
  BlockerModule.startBlocking(packageNames, sessionId);
}

export function stopBlocking(): void {
  BlockerModule.stopBlocking();
}

export function isBlocking(): boolean {
  return BlockerModule.isBlocking();
}

export function getBlockedApps(): string[] {
  return BlockerModule.getBlockedApps();
}

export function getActiveSessionId(): string | null {
  return BlockerModule.getActiveSessionId();
}

export function hasRequiredPermissions(): PermissionStatus {
  return BlockerModule.hasRequiredPermissions();
}

export function requestUsageStatsPermission(): void {
  BlockerModule.requestUsageStatsPermission();
}

export function requestOverlayPermission(): void {
  BlockerModule.requestOverlayPermission();
}

export function addBlockedAppListener(
  callback: (event: { packageName: string }) => void,
): Subscription {
  return emitter.addListener('onBlockedAppDetected', callback);
}

export function addServiceStoppedListener(callback: () => void): Subscription {
  return emitter.addListener('onServiceStopped', callback);
}
