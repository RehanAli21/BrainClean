// Shape accepted by POST /api/analytics/events (see docs/API.md → Analytics).
// Every field is optional except `eventName`; the client sends only what the
// platform can provide. Server-captured fields (userId, ip, userAgent, country,
// receivedAt, …) are never sent from here — the backend derives them.
export interface AnalyticsEventInput {
  eventName: string;
  sessionId?: string;
  platform?: string;
  appVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceModel?: string;
  screenWidth?: number;
  screenHeight?: number;
  locale?: string;
  timezone?: string;
  networkType?: string;
  clientTimestamp?: string;
  properties?: Record<string, unknown>;
}
