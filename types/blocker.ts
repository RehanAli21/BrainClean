export interface AppInfo {
  packageName: string;
  appName: string;
  icon: string | null;
}

export interface PermissionStatus {
  usageStats: boolean;
  overlay: boolean;
}
