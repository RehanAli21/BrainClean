# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrainClean is a productivity and digital wellness app that blocks selected mobile apps until the user completes a task. Users create a task, start it, and selected apps are blocked until the task's minimum duration has passed and the user finishes it (or the maximum duration runs out). The mobile app is the enforcement layer.

**There are no user accounts and no login.** Tasks live only on the device. The app is free: there is no paywall, subscription or in-app purchase.

**The app is completely local. It makes no network requests** — no backend, no analytics, no feedback upload, no third-party SDKs that phone home (the Play in-app update check was removed too). The privacy policy promises this.

The mobile app has two runtime layers: React Native/Expo (UI + local state) and Kotlin (blocking enforcement). The Kotlin layer MUST survive the React Native app being killed. These are architecturally independent — React Native is a remote control, Kotlin is the engine.

**Android only. iOS is not in scope.** iOS and Web targets exist in Expo config but blocking features are Android-only.

Built with Expo (SDK 54) and React Native 0.81 using React 19 with the experimental React Compiler enabled. Uses custom dev client (`expo-dev-client`) — Expo Go is NOT supported due to native Kotlin modules.

## Common Commands

- `npm start` — Start Expo dev server
- `npm run android` — Run on Android (custom dev client)
- `npx expo lint` — Run ESLint
- `npx tsc --noEmit` — Type-check
- `npx expo prebuild` — Generate native android/ directory for Kotlin module development

## Architecture

### The Critical Boundary: RN Dies, Kotlin Lives

This is the most important rule in the entire project. When the user force-closes the app, React Native is destroyed. Blocking MUST continue.

- The Kotlin `BlockerService` is a foreground service. Android keeps it alive independently.
- All blocking state is persisted in SharedPreferences on the Kotlin side (`BlockerState`). NOT in React Native state, NOT in AsyncStorage, NOT in Zustand.
- When RN calls `startBlocking()`, Kotlin writes the config to SharedPreferences and starts the foreground service. From that point, the service is self-sufficient.
- On device reboot, `BootReceiver` checks SharedPreferences for an active session and restarts `BlockerService` automatically. No React Native involvement.
- React Native is a remote control. Kotlin is the engine. Never reverse this relationship.

### Enforcement: Kotlin Is the Only Judge

There is no backend to confirm task completion. Kotlin enforces the duration rules itself, using `SystemClock.elapsedRealtime` (monotonic, immune to the user changing the wall clock):

- **Minimum duration**: `stopBlocking()` returns `false` and keeps blocking if `BlockerState.hasMetMinimumDuration()` is false. RN must treat `false` as "not eligible yet" and show `taskDetail.notEligible`.
- **Maximum duration**: `BlockerService` ends the session itself once elapsed time reaches `maxBlockTimeMs` (a delayed runnable posted in `onStartCommand`, re-checked on SCREEN_ON). Tasks without a max use `DEFAULT_MAX_BLOCK_SECONDS` (10h) from `store/taskStore.ts`.

Never move these checks into JS — JS can be killed or bypassed.

### Two-Layer Architecture

**React Native/Expo layer** — handles all UI, the local task list, routing and preferences. No network. Standard Expo app. Dies when force-closed.

**Kotlin native layer** — handles all Android system API interactions: UsageStatsManager, system overlay windows, foreground services, notification listener, alarms. Runs independently. Survives app kill and device reboot. The Kotlin layer makes no network calls.

These layers communicate through a narrow, explicit bridge. React Native NEVER touches Android system APIs directly.

### Routing

File-based routing via Expo Router. Routes live in `app/`. The root layout (`app/_layout.tsx`) sets up i18n, theme and the setup redirect, and hides headers globally. It also runs `useClearLegacyData()`, which deletes leftovers from older versions: SecureStore keys `user_token`, `user_email`, `user_token_expires_at`, and the unsent analytics queue (AsyncStorage `brainclean-analytics-queue`).

Route groups:

- `(setup)/*` — permission setup flow (shown until `setupCompleted` is true in `uiStore`)
- `(main)/*` — the app: tabs `wellness`, `tasks`, `apps`, `settings`. `(main)/_layout.tsx` runs `useNativeSync()` and `useTaskReconcile()`.

### Tasks — On-Device Store

Tasks live in `store/taskStore.ts`: a Zustand store persisted to AsyncStorage (key `brainclean-tasks`). Types are in `types/task.ts` (`Task`, `CreateTaskInput`).

- Actions: `addTask`, `deleteTask`, `markStarted`, `markCompleted`, `reconcile(nativeBlocking, nativeSessionId)`.
- The task `id` is passed to Kotlin as the `sessionId`.
- `reconcile()` brings the records in line with the native session: a task marked active whose session is no longer running in Kotlin (max time hit, or stopped while the app was dead) is marked `autoCompleted`, with `completedAt = min(now, startedAt + max)`.
- `hooks/useTasks.ts` exports `reconcileTasks()`, `useTasksHydrated()` and `useTaskReconcile()` (runs on hydrate and whenever the app returns to foreground). Task screens also reconcile on focus.
- Only one active task at a time. Starting is also refused while `isBlocking()` is true (e.g. a native session with no local task record).

The task record is history, not enforcement. If the store and Kotlin disagree, Kotlin wins and the store is reconciled.

### Client State — Zustand

- `store/taskStore.ts` — tasks (above).
- `store/uiStore.ts` — preferences, persisted to AsyncStorage: `selectedApps`, `padlockConfirmedAt`, `tutorialSeen`, `setupCompleted`, `hasRated`, `selectedLanguage`, `themeMode`, eye-blinker and auto-block settings, and the custom block messages for the wellness features (`customMessageEye`, `customMessageAppMonitor`).

Per-task notification mode and custom message are stored on the `Task` itself.

### No Network

There is no API layer: no `services/`, no axios, no `API_BASE_URL`. Do not add `fetch`, an HTTP client, analytics, crash reporting, or any SDK that sends data, in JS or Kotlin. The only outbound action is the user tapping "Rate" on a completed task, which opens the Play Store listing via `Linking.openURL`.

### Native Bridge API

The bridge between React Native and Kotlin. Defined in `modules/blocker/` using Expo Modules API. Kotlin side is `BlockerModule.kt`.

```
startBlocking(packageNames: string[], sessionId: string, maxBlockTimeMs: number, notificationBlockMode: number, minimumDurationMs: number, customMessage: string) → void
stopBlocking()                                            → boolean   // false = minimum duration not met, still blocking
isBlocking()                                              → boolean
getBlockedApps()                                          → string[]
getActiveSessionId()                                      → string | null
getInstalledApps()                                        → AppInfo[]
hasRequiredPermissions()                                  → PermissionStatus
requestUsageStatsPermission()                             → void
requestOverlayPermission()                                → void
isBatteryOptimizationIgnored()                            → boolean
requestBatteryOptimizationExemption()                     → void
isNotificationListenerEnabled()                           → boolean
requestNotificationListenerPermission()                   → void
getDeviceManufacturer()                                   → string
openAutoStartSettings()                                   → boolean
setEyeBlinkerConfig(enabled, intervalMinutes, durationSeconds)            → void
setAutoBlockConfig(enabled, usageLimitMinutes, durationSeconds, apps)     → void
getWellnessConfig()                                       → WellnessConfig
isWellnessServiceRunning()                                → boolean
syncLocalizedStrings(strings: Record<string, string>)     → void
```

`notificationBlockMode`: 0 = off, 1 = blocked apps only, 2 = all notifications.

Events from Kotlin to RN:

- `onBlockedAppDetected` — fired when a blocked app is opened
- `onServiceStopped` — fired if the foreground service is killed by the system

The `useBlocker()` hook in `hooks/useBlocker.ts` wraps the blocking functions; `hooks/useWellness.ts` wraps the wellness ones; `hooks/useNativeSync.ts` pushes translated strings to Kotlin.

On module creation `BlockerModule` runs one-time cleanups for older versions: `LegacyScheduleCleanup.run()` (cancels old schedule alarms, deletes their notification channels and `brainclean_schedule_state` prefs) and `BlockerState.clearLegacyAuth()` (removes stored auth token / base URL).

Do NOT expand the bridge without careful consideration. Every method added is cross-language maintenance cost.

### Internationalization

`i18n/locales/*.ts` — 15 locales (en is the source). Every locale must have the same key set. Native UI text (overlays, notifications) comes from `syncLocalizedStrings` → `LocalizedStrings.kt`, with English fallbacks in Kotlin.

### Theming

The color scheme, typography, spacing and component tokens are documented in `docs/COLOR_SCHEME.md`. `constants/theme.ts` implements them; components read the active palette via `hooks/useTheme.ts` (dark is primary; `themeMode` in `uiStore`). Key values:

- **Bases**: Deep Void `#050508` (background), Surface `#12121A` (cards), Border `#272735` (dividers)
- **Accents**: Electric Blue `#2563EB` (primary), Neon Cyan `#06B6D4` (tint/tab active), Rose Alert `#F43F5E` (error/destructive), Success Teal `#10B981` (success)
- **Text**: White `#FFFFFF` (primary), Mist `#A1A1AA` (secondary/icons)
- **Sizing**: Buttons 52px height, inputs 50px, FAB 56x56, all with 12px border-radius
- **Shadows**: Primary blue glow (`rgba(37,99,235,0.3)`) on CTAs and FAB

### Components

Reusable components live in `components/` (flat structure): `PrimaryButton`, `NotificationModeSelector`, `CustomMessageField`, `PadlockProtectionCard`, `LanguagePicker`, `TutorialOverlay`, `WalkthroughOverlay` (+ `walkthroughRegistry.ts`). Components receive data via props.

## Project Structure

```
app/
├── _layout.tsx                    # Root layout: i18n, theme, setup redirect, legacy auth cleanup
├── index.tsx                      # Entry redirect
├── (setup)/
│   ├── _layout.tsx
│   └── permissions.tsx            # Permission setup wizard
└── (main)/
    ├── _layout.tsx                # useNativeSync + useTaskReconcile
    └── (tabs)/
        ├── _layout.tsx            # Bottom tabs: wellness, tasks, apps, settings
        ├── wellness/index.tsx     # Eye blinker + auto-block
        ├── tasks/
        │   ├── index.tsx          # Task list
        │   ├── new.tsx            # Create task
        │   └── [taskId].tsx       # Task detail: start / finish / delete
        ├── apps/index.tsx         # Installed apps with selection toggles
        └── settings.tsx           # Language, theme, permissions, tutorial
components/                        # See Components above
constants/
└── theme.ts
hooks/
├── useBlocker.ts                  # Blocking bridge hook
├── useTasks.ts                    # Task hydration + reconcile with native session
├── useNativeSync.ts               # Pushes translated strings to Kotlin
├── useWellness.ts
├── usePermissions.ts
├── useOemAutoStart.ts
└── useTheme.ts
i18n/locales/                      # 15 locale files
modules/blocker/
├── index.ts                       # TS bridge
└── android/src/main/java/expo/modules/blocker/
    ├── BlockerModule.kt           # Expo native module (bridge)
    ├── BlockerService.kt          # Foreground service — the core runtime
    ├── BlockerState.kt            # SharedPreferences read/write (blocking)
    ├── AppMonitor.kt              # UsageStatsManager polling loop
    ├── BlockerOverlay.kt          # TYPE_APPLICATION_OVERLAY block screen
    ├── NotificationBlockerService.kt
    ├── ServiceGuardReceiver.kt    # Alarm-based keep-alive
    ├── BootReceiver.kt
    ├── WellnessService.kt         # Eye blinker + auto-block runtime
    ├── WellnessState.kt
    ├── EyeBlinkerTimer.kt
    ├── AutoBlockTracker.kt
    ├── CountdownOverlay.kt
    ├── LocalizedStrings.kt
    └── LegacyScheduleCleanup.kt   # One-time cleanup of the removed schedule feature
store/
├── taskStore.ts                   # Zustand — tasks (on-device)
└── uiStore.ts                     # Zustand — preferences
types/
├── task.ts                        # Task, CreateTaskInput
└── blocker.ts                     # AppInfo, PermissionStatus
legal/                             # privacy.html, terms.html, REVIEW_BASELINE.md
```

## Kotlin Native Layer

### BlockerService (foreground service)

- Runs as a foreground service with a persistent notification.
- Starts when RN calls `startBlocking()`. Reads blocked packages, session ID, max/min duration, notification mode and custom message from `BlockerState`.
- Main loop: polls UsageStatsManager via AppMonitor every 250ms to detect the foreground app. If it is in the blocked list, shows BlockerOverlay.
- Stops when: RN calls `stopBlocking()` after the minimum duration, or the max block time is exceeded (`endSession()`).
- Acquires a `PARTIAL_WAKE_LOCK` for the session so polling keeps running in Doze; released in `onDestroy`.
- Must handle: service killed by system (restart via START_STICKY), low memory, Doze mode.

### AppMonitor

- Uses UsageStatsManager to query the foreground app. Polling interval: 250ms (1s while paused, e.g. screen off). This is the sole detection mechanism — there is no AccessibilityService.
- Requires PACKAGE_USAGE_STATS permission (granted via Settings, not runtime dialog).

### BlockerOverlay

- TYPE_APPLICATION_OVERLAY full-screen window shown when a blocked app is detected. Shows the task's custom message, or the localized default.
- Requires SYSTEM_ALERT_WINDOW permission.
- Dismissable only by leaving the blocked app. It must NOT have a close button.

### NotificationBlockerService

- NotificationListenerService that cancels notifications according to the active session's `notificationBlockMode`.
- Requires notification access (granted via system Notification Access settings). Requested only when the user picks a notification mode other than off.

### BlockerState

- Wrapper around SharedPreferences for blocking state. Stores: `is_active`, `blocked_packages`, `session_id`, `started_at`, `elapsed_realtime_at_start`, `max_block_time_ms`, `min_duration_ms`, `notification_block_mode`, `custom_message`.
- `getElapsedSinceStart()` uses `SystemClock.elapsedRealtime`; `hasMetMinimumDuration()` gates `stopBlocking()`.
- This is the source of truth for the Kotlin layer. If SharedPreferences says blocking is active, the service blocks. Period.
- Excluded from Android backup (see `plugins/withProductionAndroidConfig.js`).

### WellnessService

Separate foreground service for the wellness tab features (eye-blinker breaks and auto-block after a usage limit). State in `WellnessState`; configured via `setEyeBlinkerConfig` / `setAutoBlockConfig`. Independent of task blocking.

### BootReceiver

- BroadcastReceiver registered for BOOT_COMPLETED in AndroidManifest.xml.
- On boot: if `BlockerState.isActive()`, starts BlockerService (and restarts WellnessService if enabled).

### ServiceGuardReceiver

- Alarm-driven keep-alive, fired every ~2 minutes while a session is active, scheduled with `setAndAllowWhileIdle` (fires during Doze).
- On fire: if `BlockerState.isActive()` and the service is not running, relaunches `BlockerService`; then reschedules itself.
- Cancelled only when the session ended cleanly. If the OS killed the service, `isActive` stays true and the guard stays armed.
- Purpose: aggressive OEMs (Infinix XOS, Xiaomi MIUI, Oppo ColorOS, Vivo FunTouch) kill foreground services despite Android's rules. Requires battery optimization exemption for reliable firing.
- Caveat: on Transsion XOS the OS freezes the whole package ~60s after going to background unless AutoStart/lock is enabled. In that state the alarm fires but the receiver never runs — see "OEM AutoStart" below.

### OEM AutoStart and the padlock-in-recents flow

Chinese OEM skins (Transsion XOS, MIUI, ColorOS, FunTouch, EMUI/MagicOS) enforce a custom AutoStart whitelist on top of standard Android. Apps not on this whitelist are frozen ~60s after going to background and refused service-rebind with `W/ActivityManager: AutoStart Limit`. There is **no public API** to query or toggle this.

On most XOS/OxygenOS versions the user-facing fix is a **menu action in the recent apps view**: open recents → tap the menu icon next to the app name → tap Lock. The locked app is exempted from the OEM's kill list.

`PadlockProtectionCard` walks the user through the gesture with a 3-step illustration and an "I've Locked It" button, which sets `padlockConfirmedAt` in `uiStore`. A "Show instructions again" link resets it.

`useOemAutoStart()` exposes the detected brand and a `requiresAutoStart` flag (true for Transsion/Xiaomi/Oppo/Vivo/Huawei/Samsung). The card only renders on those devices. `openAutoStartSettings()` remains as a fallback deep-link but is not used in the current UX.

## Permissions Setup Flow

1. **Usage Stats Access** (PACKAGE_USAGE_STATS) — detect the foreground app
2. **Overlay Permission** (SYSTEM_ALERT_WINDOW) — show the block screen
3. **Ignore Battery Optimizations** (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) — keep polling and alarms reliable in Doze. A system Allow/Deny dialog.

Notification Access is optional and requested only when the user picks a notification block mode. `POST_NOTIFICATIONS` is needed for the foreground-service notifications.

`(setup)/permissions.tsx` walks the user through each step. `usePermissions()` re-checks `hasRequiredPermissions()` on app foreground. The task Start action also re-validates permissions and links back to setup if anything is missing.

## Legal Docs

`legal/privacy.html` and `legal/terms.html` state that the app sends nothing off the device. Any change to data flows, permissions or storage — and above all any network call — must be reflected there. Review incrementally from the commit recorded in `legal/REVIEW_BASELINE.md`.

## Key Conventions

- **Path alias**: `@/` maps to project root (configured in both `tsconfig.json` and `babel.config.js` module-resolver)
- **TypeScript strict mode** is enabled with `"ignoreDeprecations": "6.0"` for baseUrl compatibility
- **Dark theme is primary** — design and test dark mode first
- **Portrait orientation only** (set in `app.json`)
- **New Architecture** is enabled (`newArchEnabled: true`)
- **React Compiler** is enabled (`experiments.reactCompiler: true`)
- **Custom dev client required** — Expo Go does not support native Kotlin modules
- **All dependencies pinned** to exact versions in package.json (no `^` or `~` prefixes)

## Coding Standards

### TypeScript

- Strict mode. No `any` types except when interfacing with native modules or third-party libraries.
- Define shared types in `types/`. Bridge types (AppInfo, PermissionStatus) live in `types/blocker.ts`; `WellnessConfig` is in `modules/blocker/index.ts`.
- Prefer `interface` for object shapes, `type` for unions and utility types.

### Kotlin

- Use Kotlin idioms. No Java patterns in Kotlin code.
- All blocking SharedPreferences access goes through BlockerState (wellness through WellnessState) — never read/write directly elsewhere.
- Use coroutines for async work in the foreground services, not threads.
- Keep the bridge module thin — translate between RN types and Kotlin types, not business logic. The exception is the minimum-duration gate in `stopBlocking`, which must live in Kotlin.
- Log important state transitions (service started, blocked app detected, overlay shown, session ended) for debugging.

### Forms & Validation

- No form libraries. All forms use plain controlled inputs with `useState`.
- Validate input with Zod `schema.safeParse(data)` before saving.
- Show validation errors inline next to the relevant input field.
- Keep form state local to the component — do not put form input values in Zustand.

### Button Behavior

- Every button must be **single-click guarded**: disable on press, stay disabled during async work, re-enable in a `finally` block after a minimum 1-second cooldown.
- Disable the button BEFORE starting the work, not after.
- For PrimaryButton with `isLoading`: pass `disabled={busy}` and set busy state before the call.
- For TouchableOpacity / FAB: use a `useRef<boolean>(false)` guard or `useState` + `setTimeout(1000)` cooldown.
- This applies to ALL buttons — task actions, navigation actions, toggles that trigger side effects.

### Error Handling

- Native module errors (permissions denied, service failed to start) must surface to the user via clear UI messages, not silent failures.
- `stopBlocking()` returning `false` is not an error — show the "not eligible yet" message.
- If BlockerService is killed by the system, it must restart via START_STICKY / ServiceGuardReceiver and emit `onServiceStopped` to RN if the app is open.

## Do NOT

- Do NOT store blocking state in React Native (AsyncStorage, Zustand, or component state). SharedPreferences on the Kotlin side is the source of truth; the task store is only a record.
- Do NOT enforce minimum/maximum duration in JS. Kotlin decides.
- Do NOT add any network call (backend, analytics, feedback upload, crash reporting, third-party SDKs that send data). The app is fully local and the privacy policy says so.
- Do NOT add login, accounts, or a backend copy of tasks.
- Do NOT add an AccessibilityService. The Play Store flags accessibility-for-blocking as a policy risk and the 250ms UsageStatsManager poll is sufficient. Notification suppression uses NotificationListenerService, which is allowed.
- Do NOT put a close/dismiss button on the blocking overlay. The user must leave the blocked app.
- Do NOT install or use any form library (React Hook Form, Formik, etc.).
- Do NOT add Redux, MobX, Jotai, or React Context for state. Zustand is the only state library.
- Do NOT expand the native bridge without careful consideration. Every method is cross-language maintenance cost.
- Do NOT use Expo Go for development. Custom dev client is required for native Kotlin modules.
