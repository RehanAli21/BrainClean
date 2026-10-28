/** Backend API base URL (feedback and analytics only). Set EXPO_PUBLIC_API_BASE_URL via EAS secrets for production builds. */
export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.brainclean.app/api';
// process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://192.168.100.5:8080/api';
