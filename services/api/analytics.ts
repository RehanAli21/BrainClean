import { API_BASE_URL } from '@/constants/config';
import type { AnalyticsEventInput } from '@/types/analytics';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Analytics uses its OWN axios instance, deliberately WITHOUT the response
// interceptor that `client.ts` installs. Two reasons:
//   1. Analytics is fire-and-forget telemetry — a failed send must never surface
//      an error to the user or, worse, trigger the 401 auto-logout.
//   2. The write endpoint is public; the Bearer token is attached only so the
//      backend can associate events with the signed-in user (it is optional).
const analyticsClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
	headers: { 'Content-Type': 'application/json' },
});

analyticsClient.interceptors.request.use(async (config) => {
	try {
		const token = await SecureStore.getItemAsync('user_token');
		if (token) config.headers.Authorization = `Bearer ${token}`;
	} catch {}
	return config;
});

/** POSTs a batch (1..100 events) to the analytics endpoint. Throws on failure. */
export async function sendAnalyticsEvents(events: AnalyticsEventInput[]): Promise<void> {
	await analyticsClient.post('/analytics/events', { events });
}
