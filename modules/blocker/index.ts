import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

import type { AppInfo, PermissionStatus } from '@/types/blocker';

const BlockerModule = requireNativeModule('BlockerModule');

export async function getInstalledApps(): Promise<AppInfo[]> {
  return BlockerModule.getInstalledApps();
}

export function startBlocking(
  packageNames: string[],
  sessionId: string,
  authToken: string,
  baseUrl: string,
  maxBlockTimeMs: number,
  notificationBlockMode: number,
  minimumDurationMs: number,
): void {
  BlockerModule.startBlocking(packageNames, sessionId, authToken, baseUrl, maxBlockTimeMs, notificationBlockMode, minimumDurationMs);
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

export function isBatteryOptimizationIgnored(): boolean {
  return BlockerModule.isBatteryOptimizationIgnored();
}

export function requestBatteryOptimizationExemption(): void {
  BlockerModule.requestBatteryOptimizationExemption();
}

export function isNotificationListenerEnabled(): boolean {
  return BlockerModule.isNotificationListenerEnabled();
}

export function requestNotificationListenerPermission(): void {
  BlockerModule.requestNotificationListenerPermission();
}

export function getDeviceManufacturer(): string {
  return BlockerModule.getDeviceManufacturer();
}

// Returns true if a known OEM-specific AutoStart screen was opened.
// Returns false if we had to fall back to the generic App Info screen
// (still works — user just navigates one extra tap).
export function openAutoStartSettings(): boolean {
  return BlockerModule.openAutoStartSettings();
}

export interface WellnessConfig {
  eyeBlinkerEnabled: boolean;
  eyeBlinkerIntervalMinutes: number;
  eyeBlinkerDurationSeconds: number;
  autoBlockEnabled: boolean;
  autoBlockUsageLimitMinutes: number;
  autoBlockDurationSeconds: number;
  autoBlockApps: string[];
}

export function setEyeBlinkerConfig(
  enabled: boolean,
  intervalMinutes: number,
  durationSeconds: number,
): void {
  BlockerModule.setEyeBlinkerConfig(enabled, intervalMinutes, durationSeconds);
}

export function setAutoBlockConfig(
  enabled: boolean,
  usageLimitMinutes: number,
  durationSeconds: number,
  apps: string[],
): void {
  BlockerModule.setAutoBlockConfig(enabled, usageLimitMinutes, durationSeconds, apps);
}

export function getWellnessConfig(): WellnessConfig {
  return BlockerModule.getWellnessConfig();
}

export function isWellnessServiceRunning(): boolean {
  return BlockerModule.isWellnessServiceRunning();
}

export interface ScheduleInfo {
  id: string;
  hour: number;
  minute: number;
  durationHours: number;
  durationMinutes: number;
  repeatDays: number[];
  label: string;
  enabled: boolean;
  notificationBlockMode: number;
}

export function addSchedule(
  hour: number,
  minute: number,
  durationHours: number,
  durationMinutes: number,
  repeatDays: number[],
  label: string,
  notificationBlockMode: number,
): string {
  return BlockerModule.addSchedule(hour, minute, durationHours, durationMinutes, repeatDays, label, notificationBlockMode);
}

export function removeSchedule(id: string): void {
  BlockerModule.removeSchedule(id);
}

export function toggleSchedule(id: string, enabled: boolean): void {
  BlockerModule.toggleSchedule(id, enabled);
}

export function getSchedules(): ScheduleInfo[] {
  return BlockerModule.getSchedules();
}

export function syncScheduleConfig(
  authToken: string,
  baseUrl: string,
  selectedApps: string[],
): void {
  BlockerModule.syncScheduleConfig(authToken, baseUrl, selectedApps);
}

// True when the OS allows exact alarms (auto-granted via USE_EXACT_ALARM;
// false only if the user explicitly revoked it in system settings).
export function canScheduleExactAlarms(): boolean {
  return BlockerModule.canScheduleExactAlarms();
}

// Clears the auth token persisted on the Kotlin side (schedule config).
// Call on logout and account deletion.
export function clearAuthState(): void {
  BlockerModule.clearAuthState();
}

// Pushes translated strings for native UI (overlays, notifications).
// Call on app start and whenever the language changes.
export function syncLocalizedStrings(strings: Record<string, string>): void {
  BlockerModule.syncLocalizedStrings(strings);
}

export function addBlockedAppListener(
  callback: (event: { packageName: string }) => void,
): EventSubscription {
  return BlockerModule.addListener('onBlockedAppDetected', callback);
}

export function addServiceStoppedListener(callback: () => void): EventSubscription {
  return BlockerModule.addListener('onServiceStopped', callback);
}
