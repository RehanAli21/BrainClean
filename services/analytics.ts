import { sendAnalyticsEvents } from '@/services/api/analytics';
import type { AnalyticsEventInput } from '@/types/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Dimensions, Platform } from 'react-native';

// Client-side product analytics for POST /api/analytics/events.
//
// Design:
//  - `track()` stamps each event with the shared device context + the current
//    session id and pushes it onto a queue that is mirrored to AsyncStorage, so
//    events survive the app being force-closed before they're sent.
//  - A batch of up to 100 is flushed on a timer, when the app backgrounds, and
//    when the queue gets large. Failed sends stay queued and retry later.
//  - Everything is wrapped in try/catch: telemetry must never crash the app or
//    block the UI. Sends are fire-and-forget (see services/api/analytics.ts).

const QUEUE_KEY = 'brainclean-analytics-queue';
const MAX_BATCH = 100; // API hard cap: <=100 events per request
const MAX_QUEUE = 500; // drop oldest beyond this so an offline device can't grow forever
const FLUSH_INTERVAL_MS = 20_000;
const MAX_BATCHES_PER_FLUSH = 3; // stay well under the 30 req/min write limit
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // >30 min idle starts a new session

function uuidv4(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

type DeviceContext = Pick<
	AnalyticsEventInput,
	'platform' | 'appVersion' | 'osName' | 'osVersion' | 'deviceModel' | 'screenWidth' | 'screenHeight' | 'locale' | 'timezone'
>;

function buildDeviceContext(): DeviceContext {
	const ctx: DeviceContext = { platform: Platform.OS };

	try {
		ctx.appVersion = Constants.expoConfig?.version ?? undefined;
	} catch {}

	// Android exposes Model/Release/Version on Platform.constants; the RN types
	// are platform-split, so read them loosely.
	try {
		const c = Platform.constants as any;
		ctx.osName = Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : Platform.OS;
		ctx.osVersion = c?.Release != null ? String(c.Release) : String(Platform.Version);
		if (c?.Model) ctx.deviceModel = String(c.Model);
	} catch {}

	try {
		const { width, height } = Dimensions.get('window');
		ctx.screenWidth = Math.round(width);
		ctx.screenHeight = Math.round(height);
	} catch {}

	try {
		const opts = Intl.DateTimeFormat().resolvedOptions();
		ctx.timezone = opts.timeZone;
		ctx.locale = opts.locale;
	} catch {}

	return ctx;
}

class Analytics {
	private queue: AnalyticsEventInput[] = [];
	private context: DeviceContext = {};
	private sessionId: string | null = null;
	private lastActivityAt = 0;
	private flushing = false;
	private initialized = false;

	init(): void {
		if (this.initialized) return;
		this.initialized = true;
		this.context = buildDeviceContext();

		// Restore any events that didn't get sent before the last app close.
		AsyncStorage.getItem(QUEUE_KEY)
			.then((raw) => {
				if (!raw) return;
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					this.queue = [...parsed, ...this.queue].slice(-MAX_QUEUE);
					this.flush();
				}
			})
			.catch(() => {});

		setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

		AppState.addEventListener('change', (status) => {
			// Flush promptly when leaving the foreground — that's when the OS is
			// most likely to reclaim the process.
			if (status === 'background' || status === 'inactive') this.flush();
		});
	}

	private currentSessionId(): string {
		const now = Date.now();
		if (!this.sessionId || now - this.lastActivityAt > SESSION_TIMEOUT_MS) {
			this.sessionId = uuidv4();
		}
		this.lastActivityAt = now;
		return this.sessionId;
	}

	/** Queue an event. Safe to call anywhere; never throws. */
	track(eventName: string, properties?: Record<string, unknown>): void {
		try {
			const event: AnalyticsEventInput = {
				...this.context,
				eventName,
				sessionId: this.currentSessionId(),
				clientTimestamp: new Date().toISOString(),
				...(properties ? { properties } : {}),
			};
			this.queue.push(event);
			if (this.queue.length > MAX_QUEUE) {
				this.queue = this.queue.slice(-MAX_QUEUE);
			}
			this.persist();
			if (this.queue.length >= MAX_BATCH) this.flush();
		} catch {}
	}

	/** Send queued events in batches. Failed batches stay queued for next time. */
	async flush(): Promise<void> {
		if (this.flushing || this.queue.length === 0) return;
		this.flushing = true;
		try {
			for (let i = 0; i < MAX_BATCHES_PER_FLUSH && this.queue.length > 0; i++) {
				const batch = this.queue.slice(0, MAX_BATCH);
				try {
					await sendAnalyticsEvents(batch);
				} catch {
					// Offline or server error — keep everything and retry later.
					break;
				}
				this.queue = this.queue.slice(batch.length);
				this.persist();
			}
		} finally {
			this.flushing = false;
		}
	}

	private persist(): void {
		AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue.slice(-MAX_QUEUE))).catch(() => {});
	}
}

export const analytics = new Analytics();
