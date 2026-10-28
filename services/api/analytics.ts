import { API_BASE_URL } from '@/constants/config';
import type { AnalyticsEventInput } from '@/types/analytics';
import axios from 'axios';

// Analytics uses its OWN axios instance, deliberately WITHOUT the logging
// interceptors that `client.ts` installs: it is fire-and-forget telemetry and a
// failed send must never surface an error. The write endpoint is public.
const analyticsClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
	headers: { 'Content-Type': 'application/json' },
});

/** POSTs a batch (1..100 events) to the analytics endpoint. Throws on failure. */
export async function sendAnalyticsEvents(events: AnalyticsEventInput[]): Promise<void> {
	await analyticsClient.post('/analytics/events', { events });
}
