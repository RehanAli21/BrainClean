# BrainClean — Full Project Audit Report

**Date:** 2026-07-17
**Version audited:** 1.3.0 (branch `dev`, including uncommitted schedules/blocking changes)
**Status (2026-07-19):** All client-side fixes below have been APPLIED (C1–C4, H1–H6, M1–M9, L1–L6; M10 and the Backend follow-ups remain server-side work). Additionally, a live subscription bug was found and fixed during verification: `useSubscription.ts` sent `purchase.transactionReceipt` (removed in expo-iap 4.x, always undefined → empty purchaseToken) instead of `purchase.purchaseToken` to `/subscriptions/verify`.
**Scope:** React Native/Expo layer, Kotlin native layer, manifests, config plugin, build config. Backend (Spring) not audited — see [Backend follow-ups](#backend-follow-ups).

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

---

## 🔴 Critical

### C1. Schedules broken on Android 12+ — missing exact-alarm permission

**Where:** `modules/blocker/android/src/main/java/expo/modules/blocker/ScheduleAlarmReceiver.kt` (`scheduleAlarm`, uses `alarmManager.setAlarmClock()`), no permission declared in `modules/blocker/android/src/main/AndroidManifest.xml`, `app.json`, or `plugins/withProductionAndroidConfig.js`.

**Problem:** `setAlarmClock()` requires `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM` on Android 12+ (API 31+). Neither is declared anywhere, so:
- Creating/toggling a schedule throws `SecurityException` → caught in JS → generic "something went wrong". The feature silently never works on ~all modern devices.
- On device reboot, `BootReceiver` → `rescheduleAll()` → `scheduleAlarm()` throws **uncaught inside a BroadcastReceiver** → background crash on every reboot for every user with an enabled schedule.

**Solution:**
1. Add to `modules/blocker/android/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
   ```
   `USE_EXACT_ALARM` is auto-granted and appropriate here because schedules are a user-facing, alarm-clock-style feature (Play reviews the justification — describe the schedule feature in the Play Console declaration). Alternative: declare `SCHEDULE_EXACT_ALARM` and gate with `alarmManager.canScheduleExactAlarms()`, deep-linking to `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM` when denied.
2. Defensive guard in `scheduleAlarm`:
   ```kotlin
   fun scheduleAlarm(context: Context, schedule: ScheduleData) {
       if (!schedule.enabled) return
       val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
       if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
           Log.e(TAG, "Exact alarms not permitted, cannot schedule ${schedule.id}")
           return
       }
       try {
           // ... existing setAlarmClock code ...
       } catch (e: SecurityException) {
           Log.e(TAG, "Failed to schedule exact alarm for ${schedule.id}", e)
       }
   }
   ```
3. Expose `canScheduleExactAlarms()` through the bridge so the schedules screen can show a "grant exact alarm permission" prompt instead of failing silently.

---

### C2. Blocking bypass via the date filter on the Tasks screen

**Where:** `app/(main)/(tabs)/tasks/index.tsx:132-136`
```ts
useEffect(() => {
    if (tasks && !hasActiveTask && isBlocking) {
        stopBlocking()
    }
}, [tasks, hasActiveTask, isBlocking, stopBlocking])
```

**Problem:** `tasks` is the list for the **user-selected date**. While blocking is active, the user opens Tasks → picks yesterday in the date picker → that list has no active task → `stopBlocking()` kills the native session while the backend task is still active. **The core enforcement can be defeated in two taps.** It also mis-fires if today's `by-date` list doesn't include an active task started before midnight.

**Solution:** Only stop when the native session's own task is confirmed finished. Match on session ID and verify with the backend:
```ts
const activeSessionId = useBlocker().activeSessionId

useEffect(() => {
    if (!isBlocking || !activeSessionId || !tasks) return
    // Only trust the list if it actually contains the session's task
    const sessionTask = tasks.find(t => t.id === activeSessionId)
    if (sessionTask && sessionTask.completed) {
        stopBlocking()
    }
    // If the session task is not in this date's list, do nothing —
    // TaskStatusChecker (Kotlin) is the authority for auto-unblocking.
}, [tasks, isBlocking, activeSessionId, stopBlocking])
```
The Kotlin `TaskStatusChecker` already unblocks when the backend reports zero active tasks — RN does not need an aggressive fallback. If you want an RN-side fallback at all, fetch the specific task by ID (`useTaskQuery(activeSessionId)`) instead of inferring from a date-filtered list.

---

### C3. 401 auto-logout causes a login/tasks redirect loop

**Where:** `services/api/client.ts:58-66` + `context/AuthContext.tsx:62-73`

**Problem:** The interceptor deletes SecureStore keys and navigates to `/auth/login`, but never clears the React state in `AuthContext`. The route-protection effect then sees `token != null && inAuthGroup` and redirects **back** to `/(main)/(tabs)/tasks`, whose queries 401 again → infinite bounce until the app is force-closed.

**Solution:** Let the interceptor trigger the real `logout()`. Simplest pattern — a logout callback registered by the provider:

```ts
// services/api/authEvents.ts
type LogoutHandler = () => void
let handler: LogoutHandler | null = null
export const registerLogoutHandler = (h: LogoutHandler) => { handler = h }
export const triggerLogout = () => { handler?.() }
```

```ts
// client.ts (response interceptor)
if ((status === 401 || status === 403) && !originalRequest._retry && !isAuthEndpoint) {
    triggerLogout()          // clears context state + storage + navigates
    return Promise.reject(error)
}
```

```tsx
// AuthContext.tsx
useEffect(() => {
    registerLogoutHandler(logout)
}, [])
```
Also debounce: multiple parallel 401s should only trigger one logout (guard with a `loggingOut` flag).

---

### C4. Plaintext JWT in SharedPreferences, included in Google cloud backup, never cleared

**Where:**
- `BlockerState.kt` (`KEY_AUTH_TOKEN`) and `ScheduleState.kt` (`KEY_AUTH_TOKEN`) — plain `SharedPreferences`.
- App manifest: `android:allowBackup="true"` with expo-secure-store's backup rules, which exclude **only SecureStore's own prefs** — so `brainclean_blocker_state` and `brainclean_schedule_state` (with live JWTs) are uploaded to Google Drive Auto Backup and restored to other devices.
- `AuthContext.logout()` and account deletion never clear `ScheduleState` — the token persists in plaintext indefinitely after logout.

**Solution (three parts):**
1. **Exclude the prefs from backup.** Add custom rules via the config plugin (merge with the secure-store ones). Create `android/app/src/main/res/xml` content through `withDangerousMod` in `withProductionAndroidConfig.js`:
   ```xml
   <!-- full-backup-content (API ≤ 30) -->
   <full-backup-content>
     <exclude domain="sharedpref" path="brainclean_blocker_state.xml"/>
     <exclude domain="sharedpref" path="brainclean_schedule_state.xml"/>
     <exclude domain="sharedpref" path="SecureStore.xml"/>
   </full-backup-content>
   <!-- data-extraction-rules (API ≥ 31): same excludes under <cloud-backup> and <device-transfer> -->
   ```
   Point `android:fullBackupContent` / `android:dataExtractionRules` at these files (replacing the secure-store defaults; keep its excludes).
2. **Clear native state on logout / account deletion.** Add a bridge function:
   ```kotlin
   Function("clearAuthState") {
       val context = appContext.reactContext ?: return@Function
       ScheduleState.getInstance(context).clearAuth()   // token="", baseUrl=""
       // optionally: cancel all schedule alarms + disable schedules
   }
   ```
   Call it from `logout()` and after `deleteAccount()`. Decide the product rule for an **active blocking session** on logout (today logout is disabled while blocking — keep that; but delete-account should stop blocking and cancel schedules explicitly).
3. **(Hardening, optional):** move the token in both state classes to `EncryptedSharedPreferences` (androidx.security-crypto). Keep the non-secret keys where they are.

---

## 🟠 High

### H1. Scheduled blocking silently fails with expired/stale tokens

**Where:** `ScheduleAlarmReceiver.executeSchedule` — token snapshotted by `syncScheduleConfig` whenever the schedules screen is opened; alarms can fire days later.

**Problem:** The app intentionally logs out 24h before JWT expiry, so an untouched schedule eventually fires with a dead token → `createTask` 401 → logged and skipped. The user's scheduled focus block never happens and they are never told.

**Solution:**
1. **Notify on failure.** In `executeSchedule`, when `createTask`/`startTask` fails, post a high-priority notification: "Couldn't start your scheduled block — open BrainClean and sign in." Reuse `showScheduleNotification`'s channel.
2. **Refresh the snapshot more often.** Call `syncScheduleConfig` on every app foreground (root layout `AppState` listener), not only when the schedules screen is opened.
3. **Long-term:** implement a refresh-token endpoint on the backend and let the Kotlin layer refresh before calling `/tasks` (keep the Kotlin HTTP layer minimal — one refresh call).

### H2. Schedule execution can be killed by the broadcast time budget

**Where:** `ScheduleAlarmReceiver.onReceive` uses `goAsync()` (~10s budget) but runs two sequential HTTP calls with 15s connect + 15s read timeouts each.

**Problem:** On a slow network the process is killed mid-flow. Worst case: backend task created **and started** (user locked server-side) but `BlockerService` never started (device not blocking) — or task created but never started (orphan task).

**Solution:** Do the network work inside the foreground service, not the receiver:
1. Receiver only does: read schedule → `BlockerService.start(context, pendingScheduleId)` (extras or a `pending_schedule` key in `BlockerState`) → reschedule next alarm. All well under 10s.
2. `BlockerService.onStartCommand` detects the pending schedule, calls `startForeground()` immediately (satisfies the 5s FGS rule), then performs `createTask` + `startTask` on a coroutine. On success, writes the real session via `startSession(...)`; on failure, posts the failure notification (H1) and `stopSelf()`.
3. Reduce the HTTP timeouts for this path to 10s connect / 10s read.

### H3. Uncaught `ForegroundServiceStartNotAllowedException` in receivers

**Where:** `BootReceiver`, `BlockerWatchdogReceiver`, `WellnessWatchdogReceiver`, `ScheduleAlarmReceiver` — all call `BlockerService.start(context)` / `WellnessService.start(context)` bare.

**Problem:** Background FGS starts on Android 12+ are only allowed because the app holds `SYSTEM_ALERT_WINDOW`. If the user revokes overlay permission (or an OEM misbehaves), `startForegroundService` throws and **crashes in the receiver**.

**Solution:** Make the companion `start()` safe once, so every caller is covered:
```kotlin
fun start(context: Context) {
    try {
        val intent = Intent(context, BlockerService::class.java)
        ContextCompat.startForegroundService(context, intent)
    } catch (e: Exception) {           // ForegroundServiceStartNotAllowedException etc.
        Log.e(TAG, "Unable to start BlockerService", e)
    }
}
```
Same for `WellnessService.start`. Optionally, when the catch fires, post a notification asking the user to reopen BrainClean (tapping a notification grants a FGS-start exemption).

### H4. Already-open blocked app is not detected when a session starts

**Where:** `AppMonitor.getForegroundPackage()` — only `ACTIVITY_RESUMED` events from the last 10s.

**Problem:** If the user is already inside Instagram when the session starts (scheduled block, or task started from a notification/split-screen), there is no RESUMED event in the window — the app is never blocked until they leave and return.

**Solution:** Port `AutoBlockTracker`'s `lastKnownForeground` pattern into `AppMonitor`, and widen only the *first* query:
```kotlin
// in the polling loop
val windowMs = if (firstPoll) 60_000L else EVENT_WINDOW_MS
```
and keep the last non-null result:
```kotlin
val detected = getForegroundPackage(usageStatsManager, windowMs)
if (detected != null) lastKnownForeground = detected
lastKnownForeground?.let { onForegroundAppChanged(it) }
firstPoll = false
```

### H5. Notification-listener enabled check fails on some OEMs

**Where:** `BlockerModule.kt` `isNotificationListenerEnabled` — string `contains` on the fully-qualified component.

**Problem:** Several OEMs store the abbreviated form (`com.brainclean.app/.NotificationBlockerService`) in `enabled_notification_listeners`, so the check returns false even after the user grants access → user is stuck in a grant loop.

**Solution:**
```kotlin
Function("isNotificationListenerEnabled") {
    val context = appContext.reactContext ?: return@Function false
    androidx.core.app.NotificationManagerCompat
        .getEnabledListenerPackages(context)
        .contains(context.packageName)
}
```

### H6. 403 responses trigger full logout

**Where:** `services/api/client.ts:58`

**Problem:** Spring commonly returns 403 for authorization failures that are not "bad token" (role checks, CSRF, method security). Any such response wipes the session.

**Solution:** Auto-logout on **401 only**:
```ts
if (status === 401 && !originalRequest._retry && !isAuthEndpoint) { ... }
```
If the backend genuinely uses 403 to mean "token invalid", change the backend to return 401 for that case (Spring: customize `AuthenticationEntryPoint` vs `AccessDeniedHandler`).

---

## 🟡 Medium

### M1. "Block all notifications" cancels calls, SMS, and alarms

**Where:** `NotificationBlockerService.kt`, mode 2 — cancels everything except BrainClean's own package.

**Risk:** User harm (missed emergency calls) and Play policy exposure.

**Solution:** Whitelist critical categories and system packages:
```kotlin
2 -> {
    val n = sbn.notification
    val critical = n.category in setOf(
        Notification.CATEGORY_CALL, Notification.CATEGORY_ALARM,
        Notification.CATEGORY_MESSAGE /* optional */, Notification.CATEGORY_SYSTEM
    )
    val isSystem = sbn.packageName == "android" ||
        sbn.packageName == applicationContext.packageName ||
        sbn.packageName == getDefaultDialerPackage()
    if (!critical && !isSystem) cancelNotification(sbn.key)
}
```
(`getDefaultDialerPackage()` via `TelecomManager.defaultDialerPackage`.) At minimum: never cancel `CATEGORY_CALL` and `CATEGORY_ALARM`.

### M2. Duplicate max-time runnable on service restart

**Where:** `BlockerService.onStartCommand` — posts a new `maxTimeRunnable` without removing the previous one; `onStartCommand` can run multiple times per service instance (watchdog, repeated `startBlocking`).

**Solution:** At the top of the max-time block:
```kotlin
maxTimeRunnable?.let { mainHandler.removeCallbacks(it) }
```

### M3. Up-to-24h partial wake lock

**Where:** `BlockerService.acquireWakeLock` — held for the entire session (default cap 24h).

**Risk:** Play Vitals flags excessive wake locks; battery drain hurts ratings.

**Solution:** Only hold the wake lock while the screen is off *and* polling is required — or better, pause the 250 ms poll while the screen is off (nobody opens apps with the screen off) and resume on `ACTION_SCREEN_ON`:
```kotlin
val filter = IntentFilter().apply {
    addAction(Intent.ACTION_SCREEN_ON); addAction(Intent.ACTION_SCREEN_OFF)
}
// SCREEN_OFF → appMonitor.pause(); release wake lock
// SCREEN_ON  → appMonitor.resume(); short wake lock only if needed
```
This removes most of the battery cost with zero enforcement loss.

### M4. Stale premium/app-selection state after logout

**Where:** `AuthContext.logout()` resets only `hasRated`.

**Solution:** Reset account-scoped fields:
```ts
const ui = useUiStore.getState()
ui.setHasRated(false)
ui.setIsPremium(false)
ui.setSubscriptionState('NONE')
ui.setSubscriptionExpiresAt(null)
// product decision: also clear selectedApps / notificationBlockMode
```

### M5. Whole UI store persisted through expo-secure-store

**Where:** `store/uiStore.ts` — zustand `persist` writes the entire JSON blob through SecureStore.

**Problem:** SecureStore is for small secrets; Android warns >2048 bytes (a long `selectedApps` list exceeds this), and every write is a slow keystore round-trip.

**Solution:** Use `@react-native-async-storage/async-storage` (or MMKV) as the zustand storage. Nothing in this store is secret — the token is not in it.

### M6. Native strings hardcoded in English

**Where:** `BlockerOverlay.kt`, `CountdownOverlay` configs, `BlockerService`/`WellnessService` notifications, `ScheduleAlarmReceiver` notification.

**Solution:** Either (a) pass localized strings across the bridge and persist them in `BlockerState`/`WellnessState`/`ScheduleState` alongside the config (sync on language change), or (b) move them to Android `strings.xml` with per-locale resources. Option (a) keeps translations in the existing i18n files; sync via `syncScheduleConfig`-style call on app start and on language change.

### M7. Schedules ignore the premium gate at execution time

**Where:** `ScheduleAlarmReceiver.executeSchedule` — backend will 402 on task creation if the subscription lapsed; failure is silent.

**Solution:** Covered by H1's failure notification (show "subscription required" text when the response is 402). Optionally disable all schedules when the subscription query reports `hasAccess: false`.

### M8. Console logging in production

**Where:** `client.ts` (every request URL), `login.tsx` (full Google error JSON), `GoogleAuthModule.kt` (SHA-1 + package).

**Solution:** Add to `babel.config.js`:
```js
env: { production: { plugins: ['transform-remove-console'] } }
```
(with `babel-plugin-transform-remove-console` as a devDependency), or wrap logs in `if (__DEV__)`. Downgrade the Kotlin sign-in logs to `Log.d`.

### M9. Local release builds silently fall back to the debug keystore

**Where:** `plugins/withProductionAndroidConfig.js` signing config.

**Solution:** Fail loudly instead of falling back:
```groovy
release {
    if (project.hasProperty('BRAINCLEAN_UPLOAD_STORE_FILE')) { ... }
    else { throw new GradleException("Release signing not configured (BRAINCLEAN_UPLOAD_STORE_FILE missing)") }
}
```
EAS production uses remote credentials, so this only affects local `assembleRelease`.

### M10. Timezone assumption in `by-date` queries

**Where:** `hooks/queries/useTasks.ts` `getTodayDate()` uses device-local date; the Spring backend's interpretation of `?date=` is unverified.

**Solution:** Verify backend semantics. Either send the device timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) as a query param and resolve server-side, or define the contract as "user's local date" and have the backend store/compare dates in the user's timezone. Mismatch aggravates C2.

---

## ⚪ Low

### L1. Login flash on cold start
`app/index.tsx` always redirects to `/auth/login` after 300 ms; `AuthContext` then bounces logged-in users to tasks.
**Solution:** Read auth state before redirecting:
```tsx
const { token, isLoading } = useAuth()
useEffect(() => {
    if (isLoading) return
    router.replace(token ? '/(main)/(tabs)/tasks' : '/auth/login')
}, [isLoading, token])
```

### L2. `GoogleAuthModule` blocks its thread with a latch without timeout
A hung Credential Manager call permanently blocks the module queue.
**Solution:** Use Expo's coroutine-friendly `AsyncFunction("signInWithGoogle") Coroutine { ... }` (expo-modules-core supports suspend functions), or `latch.await(2, TimeUnit.MINUTES)` with a timeout error.

### L3. Permission wizard not enforced on first launch
`(setup)/permissions` is only reachable from task creation and wellness; CLAUDE.md says it must gate first launch.
**Solution:** In the `(main)` layout, if `usePermissions().allGranted === false` and a `setupCompleted` flag is unset, `router.replace('/(setup)/permissions')`.

### L4. Known enforcement limitations (accept consciously, document)
- Uninstalling BrainClean ends blocking (no Device Admin — keep it that way for Play policy).
- Revoking Usage Access mid-session silently blinds `AppMonitor`. **Mitigation:** in the service loop, if `hasUsageStatsPermission()` becomes false, post a notification ("Blocking protection lost — Usage Access was revoked").
- Second user profile / guest mode bypasses blocking.

### L5. Dead OkHttp ProGuard rules
`withProductionAndroidConfig.js` keeps OkHttp for `TaskStatusChecker`, which actually uses `HttpURLConnection`. Harmless; remove the OkHttp keep rules (smaller config, no behavior change).

### L6. Deprecated `getRunningServices()` in watchdogs
Still works for your own services. If it ever breaks, replace with a static `@Volatile var isRunning` flag set in `onStartCommand`/`onDestroy` of the service.

---

## Suggested fix order

| Priority | Items | Why |
|---|---|---|
| 1 (before shipping current `dev` changes) | C1, C2 | Feature-breaking crash + two-tap blocking bypass, both in the new uncommitted code |
| 2 | C3, C4 | Session-handling loop; token exposure & cleanup |
| 3 | H1, H2, H3, M7 | The "alarm fires in a hostile environment" cluster — fix as one piece of work |
| 4 | H4, H5, H6 | Detection & auth-handling correctness |
| 5 | M1–M6, M8–M10 | Policy, battery, hygiene |
| 6 | L1–L6 | Polish |

---

## Backend follow-ups

The Spring backend was not audited. Verify:

1. **403 semantics** — never return 403 for "invalid/expired token" (use 401); reserve 403 for authorization rules (H6).
2. **`/tasks/by-date` timezone** — define whether `date` is UTC or user-local (M10).
3. **JWT lifetime vs schedules** — consider a refresh-token endpoint so long-lived schedules keep working (H1).
4. **`/tasks/{id}/complete` enforcement** — confirm minimum-duration eligibility is enforced server-side (`TASK_NOT_ELIGIBLE`), not just client-side.
5. **Rate limiting** on `/auth/*` endpoints (login, forgot-password, reset-password) and on `/tasks/status-counts` (polled every 20s per active device).
6. **Orphan tasks** from H2's partial failures — a cleanup job for tasks created but never started > N hours ago.
