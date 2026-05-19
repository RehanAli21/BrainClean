/** Backend API base URL. Set EXPO_PUBLIC_API_BASE_URL via EAS secrets for production builds. */
export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.brainclean.app/api';
// process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.100.5:8080/api';

/** How often to poll for task completion while blocking is active (ms) */
export const TASK_POLL_INTERVAL_MS = 20_000;
