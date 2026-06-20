# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrainClean is a productivity and digital wellness app that blocks selected mobile apps until the user completes a task. Users create a task, start it, and selected apps are blocked until the task is marked complete on the backend. The mobile app is the enforcement layer.

The mobile app has two runtime layers: React Native/Expo (UI + API) and Kotlin (blocking enforcement). The Kotlin layer MUST survive the React Native app being killed. These are architecturally independent — React Native is a remote control, Kotlin is the engine.

**Android only. iOS is not in scope.** iOS and Web targets exist in Expo config but blocking features are Android-only.

Built with Expo (SDK 54) and React Native 0.81 using React 19 with the experimental React Compiler enabled. Uses custom dev client (`expo-dev-client`) — Expo Go is NOT supported due to native Kotlin modules.

## API Documentation

Backend API docs are in `docs/API.md`. All auth endpoints, request/response shapes, error codes, and validation rules are documented there. Refer to it when implementing or modifying API service functions.

## Common Commands

- `npm start` — Start Expo dev server
- `npm run android` — Run on Android (custom dev client)
- `npm run ios` — Run on iOS
- `npm run web` — Run on web
- `npx expo lint` — Run ESLint
- `npx expo prebuild` — Generate native android/ directory for Kotlin module development
- `node ./scripts/reset-project.js` — Reset project state

## Architecture

### The Critical Boundary: RN Dies, Kotlin Lives

This is the most important rule in the entire project. When the user force-closes the app, React Native is destroyed. Blocking MUST continue.

- The Kotlin `BlockerService` is a foreground service. Android keeps it alive independently.
- All blocking state is persisted in SharedPreferences on the Kotlin side. NOT in React Native state, NOT in AsyncStorage, NOT in Zustand, NOT in expo-secure-store.
- When RN calls `startBlocking()`, Kotlin writes the config to SharedPreferences and starts the foreground service. From that point, the service is self-sufficient.
- On device reboot, `BootReceiver` checks SharedPreferences for an active session and restarts `BlockerService` automatically. No React Native involvement.
- React Native is a remote control. Kotlin is the engine. Never reverse this relationship.

### Two-Layer Architecture

**React Native/Expo layer** — handles all UI, API communication, routing, and state management. Standard Expo app. Dies when force-closed.

**Kotlin native layer** — handles all Android system API interactions: UsageStatsManager, system overlay windows, foreground service, notification listener. Runs independently. Survives app kill and device reboot. Kotlin MAY make API calls to the backend when needed (e.g., `TaskStatusChecker` polls for task completion while blocking is active). Keep the Kotlin HTTP layer minimal — reuse the same base URL and auth token pattern as the RN side.

These layers communicate through a narrow, explicit bridge. React Native NEVER touches Android system APIs directly.

### Routing

File-based routing via Expo Router. Routes live in `app/`. The root layout (`app/_layout.tsx`) wraps everything in `QueryClientProvider` and `AuthProvider`, and hides headers globally.

Route groups:

- `auth/*` — public routes: login, signup, forgot-password, reset-password
- `(main)/*` — protected routes: tabs (tasks, apps, settings)
- `(setup)/*` — permission setup flow (shown on first launch)

Protected routes redirect unauthenticated users to `auth/login` via the auth context + `useSegments()` pattern. Authenticated users on auth pages are redirected to `(main)/(tabs)/tasks`.

### Authentication Flow

`context/AuthContext.tsx` manages auth state via React Context. Token is stored encrypted in `expo-secure-store` (key: `user_token`), email in `user_email`. Route protection is automatic — `useSegments()` + `useNavigationContainerRef().isReady()` redirects unauthenticated users to auth pages and authenticated users away from them. The `useAuth()` hook exposes `token`, `email`, `isLoading`, `login(token, email)`, and `logout()`.

Auth lives in React Context because it integrates with Expo Router's segment-based redirect pattern. This is the ONE exception to the "no React Context for state" rule. All other server state goes through TanStack Query.

### Server State — TanStack Query

ALL data from the backend (except auth token) goes through TanStack Query. No exceptions.

- Query hooks live in `hooks/queries/` and wrap plain API functions from `services/api/`.
- Mutations MUST invalidate related queries. When a task is created, invalidate the task list. When a task is started, invalidate both the task list and task detail.
- Query keys follow the pattern: `['tasks', date]`, `['tasks', taskId]`.
- NEVER duplicate server state into Zustand, AsyncStorage, or component state.

### Client State — Zustand

Zustand owns ONLY client-local UI state. Stored in `store/uiStore.ts` with `expo-secure-store` persistence. Current state:

- `selectedApps` — package names selected for blocking
- `maxBlockTimeMinutes` — max blocking duration (default 600, range 1-1440)

If data comes from the backend, it goes through TanStack Query, not Zustand.

### API Layer

`services/api/client.ts` exports an Axios instance (`apiClient`) with:

- **Request interceptor**: injects `Authorization: Bearer` header from expo-secure-store
- **Response interceptor**: catches 401/403 and triggers auto-logout + redirect (skips auth endpoints so login/signup errors are not swallowed)
- Base URL from `constants/config.ts` (`API_BASE_URL`)
- 10s timeout

Domain service files (`services/api/tasks.ts`, `services/api/auth.ts`) export plain async functions that return typed data, NOT raw axios responses.

These functions are called by query hooks, NOT by screens/components directly.

### Native Bridge API

The bridge between React Native and Kotlin. Defined in `modules/blocker/` using Expo Modules API. Kotlin side is `BlockerModule.kt`.

Exposes these functions:

```
startBlocking(packageNames: string[], sessionId: string, authToken: string, baseUrl: string, maxBlockTimeMs: number, blockNotifications: boolean) → void
stopBlocking()                                            → void
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
```

Events from Kotlin to RN (via `BlockerModule.addListener`):

- `onBlockedAppDetected` — fired when a blocked app is opened
- `onServiceStopped` — fired if the foreground service is killed by the system

The `useBlocker()` hook in `hooks/useBlocker.ts` wraps this bridge for React components.

Do NOT expand the bridge without careful consideration. Every method added is cross-language maintenance cost.

### Theming

The complete color scheme, typography scale, spacing tokens, component tokens, and CSS custom properties for web are documented in `docs/COLOR_SCHEME.md`. This is the single source of truth for design decisions shared between mobile and web.

`constants/theme.ts` implements the mobile side. All components consume `Colors.dark` (dark mode is primary). Key values:

- **Bases**: Deep Void `#050508` (background), Surface `#12121A` (cards), Border `#272735` (dividers)
- **Accents**: Electric Blue `#2563EB` (primary), Neon Cyan `#06B6D4` (tint/tab active), Rose Alert `#F43F5E` (error/destructive), Success Teal `#10B981` (success)
- **Text**: White `#FFFFFF` (primary), Mist `#A1A1AA` (secondary/icons)
- **Sizing**: Buttons 52px height, inputs 50px, FAB 56x56, all with 12px border-radius
- **Shadows**: Primary blue glow (`rgba(37,99,235,0.3)`) on CTAs and FAB

### Components

Reusable components live in `components/` (flat structure):

- `AuthInput.tsx` — styled text input for auth forms
- `PrimaryButton.tsx` — primary action button
- `SocialButton.tsx` — social login button (e.g., Google)

Components receive data via props only.

## Project Structure

```
app/
├── _layout.tsx                    # Root layout, providers (QueryClient + AuthProvider)
├── index.tsx                      # Entry redirect
├── auth/
│   ├── login.tsx
│   ├── signup.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (setup)/
│   ├── _layout.tsx
│   └── permissions.tsx            # Permission setup wizard
├── (main)/
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx            # Bottom tab navigation
│   │   ├── tasks/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx          # Task list (filterable by date)
│   │   │   ├── new.tsx            # Create task
│   │   │   └── [taskId].tsx       # Task detail
│   │   ├── apps/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx          # Installed apps with selection toggles
│   │   └── settings.tsx           # Profile, max block time, logout
components/
├── AuthInput.tsx
├── PrimaryButton.tsx
└── SocialButton.tsx
constants/
├── config.ts                      # API_BASE_URL, TASK_POLL_INTERVAL_MS
└── theme.ts                       # Colors.dark, full theme tokens
context/
└── AuthContext.tsx                 # Auth state + Expo Router integration
hooks/
├── queries/
│   └── useTasks.ts                # useTasksQuery, useTaskQuery, mutations
├── useBlocker.ts                  # Native bridge hook
└── usePermissions.ts              # Permission status hook
modules/
└── blocker/
    ├── index.ts                   # TS bridge — exports all native functions
    ├── expo-module.config.json
    ├── package.json
    └── android/src/main/java/expo/modules/blocker/
        ├── BlockerModule.kt       # Expo native module (bridge)
        ├── BlockerService.kt      # Foreground service — the core runtime
        ├── AppMonitor.kt          # UsageStatsManager polling loop
        ├── BlockerOverlay.kt      # TYPE_APPLICATION_OVERLAY window
        ├── BlockerState.kt        # SharedPreferences read/write
        ├── NotificationBlockerService.kt   # Cancels notifications from blocked apps
        ├── TaskStatusChecker.kt   # Polls backend for task completion
        └── BootReceiver.kt        # Restart blocking on device reboot
services/
└── api/
    ├── client.ts                  # Axios instance, interceptors
    ├── tasks.ts                   # Task CRUD + start + getByDate
    └── auth.ts                    # Login, signup, forgot/reset password
store/
└── uiStore.ts                     # Zustand — selectedApps, maxBlockTimeMinutes
types/
├── task.ts                        # Task, CreateTaskRequest
├── blocker.ts                     # AppInfo, PermissionStatus
├── auth.ts                        # AuthUser, AuthResponse, ForgotPasswordResponse, ResetPasswordResponse
└── api.ts                         # ApiError
```

## Kotlin Native Layer

### BlockerService (foreground service)

- Runs as a foreground service with a persistent notification showing "BrainClean is protecting your focus."
- Starts when RN calls `startBlocking()`. Reads blocked package names, session ID, auth token, base URL, and max block time from SharedPreferences.
- Contains the main loop: polls UsageStatsManager via AppMonitor every 250ms to detect foreground app.
- If foreground app is in the blocked list, triggers BlockerOverlay.
- Stops when: RN calls `stopBlocking()`, `TaskStatusChecker` detects task completion on backend, or max block time is exceeded.
- Must handle: service killed by system (restart via START_STICKY), low memory, Doze mode.

### AppMonitor

- Uses UsageStatsManager to query foreground app.
- Polling interval: 250ms. This is the sole detection mechanism — there is no AccessibilityService fallback.
- Requires PACKAGE_USAGE_STATS permission (granted via Settings, not runtime dialog).

### BlockerOverlay

- Uses TYPE_APPLICATION_OVERLAY to show a full-screen overlay when a blocked app is detected.
- Overlay displays: "This app is blocked. Return to BrainClean to check your session."
- Requires SYSTEM_ALERT_WINDOW permission.
- Overlay must be dismissable only by returning to BrainClean or the home screen. It should NOT have a close button.

### NotificationBlockerService

- NotificationListenerService that cancels notifications posted by blocked apps while a session is active.
- Opt-in: only runs when the user enables the "Block Notifications" toggle in Settings and grants notification access.
- Requires BIND_NOTIFICATION_LISTENER_SERVICE (granted via system Notification Access settings).

### BlockerState

- Wrapper around SharedPreferences for reading/writing blocking state.
- Stores: `isActive` (boolean), `blockedPackages` (Set<String>), `sessionId` (String), `startedAt` (Long), `authToken` (String), `baseUrl` (String), `maxBlockTimeMs` (Long).
- This is the source of truth for the Kotlin layer. If SharedPreferences says blocking is active, the service blocks. Period.

### TaskStatusChecker

- Polls the backend from Kotlin to detect task completion while blocking is active.
- Uses the auth token and base URL passed via `startBlocking()`.
- When the backend reports the task is complete, triggers `stopBlocking()` automatically.
- Poll interval defined in `constants/config.ts` (`TASK_POLL_INTERVAL_MS`: 20s).

### BootReceiver

- BroadcastReceiver registered for BOOT_COMPLETED.
- On boot: reads BlockerState. If `isActive` is true, starts BlockerService.
- Registered in AndroidManifest.xml, not programmatically.

### BlockerWatchdogReceiver

- BroadcastReceiver fired by AlarmManager every ~10 minutes while a session is active.
- Scheduled by `BlockerService` via `setAndAllowWhileIdle` (fires even during Doze).
- On fire: if `BlockerState.isActive() == true` AND `BlockerService` is NOT in the running services list → calls `BlockerService.start(context)` to relaunch. Then reschedules itself.
- Purpose: aggressive OEMs (Infinix XOS, Xiaomi MIUI, Oppo ColorOS, Vivo FunTouch) kill foreground services despite Android's documented rules. This watchdog ensures the blocker comes back up.
- Cancelled in `BlockerService.onDestroy` ONLY when the session ended cleanly (i.e. `BlockerState.isActive() == false`). If the OS killed the service, `isActive` stays true and the watchdog stays armed.
- Requires battery optimization exemption (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) for reliable firing during Doze.
- Caveat: on Transsion XOS (Infinix/TECNO/Itel) the OS freezes the entire package within ~60s of going to background when AutoStart is disabled. In that frozen state the alarm fires but the receiver never runs, so the watchdog cannot save the service. Auto-Start must be enabled in OEM settings — see "OEM AutoStart" below.

### OEM AutoStart and the padlock-in-recents flow

Chinese OEM skins (Transsion XOS, MIUI, ColorOS, FunTouch, EMUI/MagicOS) enforce a custom AutoStart whitelist on top of standard Android. Apps not on this whitelist are frozen ~60s after going to background and refused service-rebind with `W/ActivityManager: AutoStart Limit`. There is **no public API** to query or toggle this.

On most XOS/OxygenOS versions the user-facing fix isn't a settings toggle — it's a **menu action in the recent apps view**: open recents → tap the menu icon next to the app name → tap Lock. The locked app is then exempted from the OEM's kill list.

The `PadlockProtectionCard` (`components/PadlockProtectionCard.tsx`) walks the user through the gesture with a 3-step illustration and a single "I've Locked It" confirm button. On confirm, `padlockConfirmedAt` is set in `uiStore` (persisted to expo-secure-store) and the card replaces itself with a "Locked in Recents" success state. A "Show instructions again" link resets the flag so the user can re-read the steps if blocking ever stops working.

`useOemAutoStart()` exposes the detected brand and a `requiresAutoStart` flag (true for Transsion/Xiaomi/Oppo/Vivo/Huawei/Samsung). The card only renders on those devices. `openAutoStartSettings()` remains available as a fallback deep-link but is not used in the current UX — the recents-menu lock works on every modern XOS version, while the AutoStart settings screen location varies.

## Permissions Setup Flow

The app requires three Android permissions. The first two require navigating to Android Settings; the third is a one-tap system dialog.

1. **Usage Stats Access** (PACKAGE_USAGE_STATS) — needed to detect foreground app
2. **Overlay Permission** (SYSTEM_ALERT_WINDOW) — needed to show blocking overlay
3. **Ignore Battery Optimizations** (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) — needed so the foreground service keeps polling during Doze / when screen is off. Shows as a system Allow/Deny dialog, not a settings page.

`BlockerService` also acquires a `PARTIAL_WAKE_LOCK` for the duration of an active session, which keeps the CPU awake so the 250ms polling coroutine fires reliably during Doze. The wake lock is released in `onDestroy`.

An optional fourth permission (Notification Access) is requested from Settings only if the user enables the "Block Notifications" toggle — it is not part of the setup wizard.

The `(setup)/permissions.tsx` screen walks the user through each sequentially. It checks status after the user returns from Settings and only allows proceeding when both are granted. The `usePermissions()` hook polls `hasRequiredPermissions()` from the native module (re-checks on app foreground via AppState listener).

This screen MUST be shown on first launch before the user can create any tasks or start blocking.

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

- Strict mode enabled. No `any` types except when interfacing with native modules or third-party libraries.
- Define API response types in `types/`. Never inline response types.
- Bridge types (AppInfo, PermissionStatus) live in `types/blocker.ts`.
- Prefer `interface` for object shapes, `type` for unions and utility types.

### Kotlin

- Use Kotlin idioms. No Java patterns in Kotlin code.
- All SharedPreferences access goes through BlockerState — never read/write directly elsewhere.
- Use coroutines for async work in the foreground service, not threads.
- Keep the bridge module thin — translate between RN types and Kotlin types, not business logic.
- Log important state transitions (service started, blocked app detected, overlay shown) for debugging.

### Forms & Validation

- No form libraries. All forms use plain controlled inputs with `useState`.
- Validate input data with Zod `schema.safeParse(data)` before calling API mutations.
- Show validation errors inline next to the relevant input field.
- Keep form state local to the component — do not put form input values in Zustand.

### Button Behavior

- Every button must be **single-click guarded**: disable on press, stay disabled during API call, re-enable in a `finally` block after a minimum 1-second cooldown.
- Disable the button BEFORE calling the API, not after.
- For mutation buttons (PrimaryButton with `isLoading`): pass `disabled={busy}` and set busy state before the mutation call.
- For non-mutation buttons (TouchableOpacity, FAB): use a `useRef<boolean>(false)` guard or `useState` + `setTimeout(1000)` cooldown.
- This applies to ALL buttons in the app — auth forms, task actions, navigation actions, toggles that trigger side effects.

### Error Handling

- API errors caught by axios interceptor for 401/403 (triggers logout via AuthContext, skips auth endpoints).
- Native module errors (permissions denied, service failed to start) must surface to the user via clear UI messages, not silent failures.
- If BlockerService is killed by the system, it must restart via START_STICKY and emit `onServiceStopped` event to RN if the app is open.

## Do NOT

- Do NOT store blocking state in React Native (AsyncStorage, Zustand, or component state). SharedPreferences on the Kotlin side is the source of truth.
- Do NOT add an AccessibilityService back to the project. The Play Store flags accessibility-for-blocking as a policy risk and the 250ms UsageStatsManager poll is sufficient for app detection. Notification suppression uses NotificationListenerService, which is a separate, allowed mechanism.
- Do NOT put a close/dismiss button on the blocking overlay. The user must leave the blocked app.
- Do NOT install or use any form library (React Hook Form, Formik, etc.). Use plain controlled inputs with useState. Validate with Zod.
- Do NOT use React Context for state management EXCEPT for auth (AuthContext integrates with Expo Router). All other server state goes through TanStack Query.
- Do NOT add Redux, MobX, or Jotai. Zustand is the only client state library.
- Do NOT put API calls directly in screens. They go through the services/api/ → hooks/queries/ chain.
- Do NOT expand the native bridge without careful consideration. Every method is cross-language maintenance cost.
- Do NOT use Expo Go for development. Custom dev client is required for native Kotlin modules.
- Do NOT hardcode the API base URL. Use `constants/config.ts`.
