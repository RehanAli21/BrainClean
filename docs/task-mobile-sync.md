# Task: Sync BrainClean mobile app with the current backend contract

This is a coordinated cleanup task on the BrainClean mobile app (Expo/React
Native, at `D:\rehan\GrayGuard`). An audit has already identified the specific
drifts — your job is to apply the fixes cleanly. Read this whole document
before starting.

---

## Background — what happened

The backend (`D:\rehan\brainclean_backend`) shipped subscription support with
these characteristics that the mobile app hasn't caught up to yet:

- **Both `POST /api/tasks` (create) and `PATCH /api/tasks/{id}/start` return
  `402 SUBSCRIPTION_REQUIRED`** when the user isn't entitled. Entitlement isn't
  just "has an active Play subscription" — see access rules below.
- **Backend is the source of truth for entitlement**, not `expo-iap`. The client
  must not decide "is this user premium?" from local Play state.
- **The `SubscriptionStatusResponse` shape changed.** Old fields (`isActive`,
  `isTrial`) do not exist. New fields do.

## The backend's access rules (checked in this order, first match wins)

1. **Admin flag on the user row** (`user.isAdmin = true`) → allowed. Admins never
   see a paywall.
2. **Grace period** — every user who existed before subscriptions launched has
   `subscription_grace_until = now() + 1 month`. Users are entitled until that
   date passes.
3. **Real subscription** in state `ACTIVE`, `IN_GRACE_PERIOD`, or `CANCELED`
   with `expiresAt` in the future → allowed.
4. Otherwise → backend returns `402 SUBSCRIPTION_REQUIRED`.

**All the client needs to know:** call `GET /api/subscriptions/status` and use
the `hasAccess` boolean. It already collapses all three rules into a single
answer. Do not try to reproduce the logic client-side.

**How the backend represents admin / grace bypass in the response:**

- Admin user with no purchase → `{ state: "ACTIVE", hasAccess: true, expiresAt: null }`
- Grace-period user with no purchase → `{ state: "ACTIVE", hasAccess: true, inTrial: true, expiresAt: <grace date> }`
- Admin or grace user WHO ALSO bought a subscription → the real subscription state, but `hasAccess` forced to `true`

So a grace-period user looks like they're on a trial ending on the grace date.
The client can happily reuse whatever "trial ends on X" UI it has.

---

## The authoritative types

Replace `types/subscription.ts` with exactly this shape. Delete the old
`isActive` and `isTrial` fields.

```ts
export type SubscriptionState = 'NONE' | 'PENDING' | 'ACTIVE' | 'PAUSED' | 'IN_GRACE_PERIOD' | 'ON_HOLD' | 'CANCELED' | 'EXPIRED'

export interface SubscriptionStatus {
	state: SubscriptionState
	hasAccess: boolean // ← single source of truth for gating
	inTrial: boolean
	autoRenewing: boolean
	productId: string | null
	startsAt: string | null // ISO 8601
	expiresAt: string | null
}

// POST /api/subscriptions/verify returns the same shape.
export type VerifyReceiptResponse = SubscriptionStatus
```

Any other file that imports subscription types must be updated to match.

---

## The fixes, in priority order

### 1. Replace local Play check with backend truth

**File:** `hooks/useSubscription.ts` (around lines 47–57)

**Wrong today:** derives `isPremium` from `hasActiveSubscriptions([SKU])` via
`expo-iap`. This is invisible to backend rules — admins, grace-period users, and
canceled-but-still-valid users all incorrectly see the paywall.

**Fix:** derive `isPremium` from `subscriptionService.getStatus()`'s
`hasAccess` field. Call it on:

- app foreground (Android + iOS if both platforms)
- after successful `/subscriptions/verify`
- on manual "restore purchases" tap
- on a `402` response from any protected endpoint (see fix #4)

Keep `expo-iap` for **buying** the subscription, not for reading state.

### 2. Wire up (or delete) `useSubscriptionStatusQuery`

**File:** `hooks/queries/useSubscription.ts`

The hook is defined but never consumed anywhere. Two options — pick one:

- **Wire it up:** call it from `AuthContext` (or wherever `isPremium` lives),
  pipe `data.hasAccess` into `useUiStore.setIsPremium(...)`. Refetch on
  foreground.
- **Delete it** if you're going with a service-call approach from fix #1.

Don't leave dead code.

### 3. Do NOT set `isPremium=true` on verify failure

**File:** `hooks/useSubscription.ts` (around lines 24–38)

**Wrong today:** even when `/subscriptions/verify` throws, the code sets
`isPremium=true` and finishes the Play transaction with a comment "backend can
reconcile via RTDN." That's incorrect — if the backend never saw a valid verify
call, it has no row for that purchase token, and the RTDN webhook logs `RTDN
referenced unknown purchase token` and drops it. The user pays but the backend
never marks them premium.

**Fix on verify failure:**

- Surface an actionable error to the user (Alert or toast: "Purchase couldn't be
  verified. Please contact support.")
- Do NOT set `isPremium=true`
- Still call `finishTransaction` if Play requires it (it does — otherwise the
  purchase stays pending and Play refunds after 3 days). Log a warning.
- Trigger a `subscriptionService.getStatus()` refresh a few seconds later in
  case the transaction propagates async
- If `hasAccess` returns true from the refresh, then set `isPremium=true`

**Fix on verify success:**

- Trust `response.hasAccess` from the verify response, not "the purchase
  succeeded so we're good"

### 4. Handle `402` on task start and task create

**Files:**

- `services/api/tasks.ts` (`create` and `start` methods)
- `hooks/queries/useTasks.ts` (task start mutation, and task create mutation
  around lines 50–59)

**Wrong today:** `PATCH /api/tasks/{id}/start` doesn't handle 402 anywhere. If a
subscription expires between polls, the mutation throws an unhandled error and
the app just fails silently. Same story for `POST /api/tasks` — both endpoints
now return `402 SUBSCRIPTION_REQUIRED` when the user has no access.

**Fix (same pattern for both mutations):**

```ts
onError: async error => {
	if (error.response?.status === 402) {
		// Backend says no access — refresh status in case local is stale, then paywall
		await queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] })
		const { data: fresh } = await subscriptionService.getStatus()
		if (!fresh.hasAccess) {
			router.push('/paywall')
		}
		return
	}
	// ... existing error handling
}
```

**Do NOT logout on 402.** See fix #5.

### 5. Explicitly exempt 402 from auto-logout

**File:** `services/api/client.ts` (response interceptor, around lines 52–62)

**Today:** interceptor logs out on 401/403. That's correct — but a future
contributor might broaden it. Add explicit code paths for 401, 402, and 403:

```ts
if (status === 401 || status === 403) {
	// Auth failure or account deactivated — clear tokens and go to sign-in
	await clearTokens()
	router.replace('/auth/login')
	return Promise.reject(error)
}
if (status === 402) {
	// Subscription required — DO NOT logout. Let the caller handle it (fix #4).
	return Promise.reject(error)
}
```

### 6. Add proactive FAB gate based on `hasAccess`

**File:** `app/(main)/(tabs)/tasks/index.tsx` (around line 264)

FAB paywall gate is fine as a UX pattern — it stops the user before they fill
out the create-task form. **But it must key off `hasAccess`, not `isPremium`
from `expo-iap`.** Update whatever variable/hook powers the FAB visibility to
use the value from fix #1 or #2.

Note: this is proactive UX only. The defensive backend enforcement is fix #4,
and both fixes are required.

### 7. Handle non-`ACTIVE` states in UX

Add these states to the paywall/settings UI so users know what's going on:

| `state`                              | UI treatment                                                    |
| ------------------------------------ | --------------------------------------------------------------- |
| `NONE`                               | show paywall on gated actions                                   |
| `ACTIVE`                             | no banner                                                       |
| `IN_GRACE_PERIOD`                    | banner "Payment issue — please update your card in Play Store"  |
| `CANCELED` (with future `expiresAt`) | banner "Your subscription ends on {date}. Renew to keep access" |
| `ON_HOLD` / `PAUSED` / `EXPIRED`     | show paywall on gated actions                                   |
| `PENDING`                            | subtle spinner "Payment processing…"                            |

`hasAccess` handles gating; `state` drives which message to show.

### 8. Decide fate of `TOKEN_EXPIRY_BUFFER_MS`

**File:** `context/AuthContext.tsx` (line 9)

Constant is defined but never consumed. Either:

- Wire it up (proactive logout ~24h before JWT expiry) and add a test for it, or
- Delete it as dead code

Don't leave orphaned constants.

### 9. Prevent doc drift

**File:** `docs/API.md` in the mobile repo (if it exists)

Your local copy is out of date and will drift again. Two options:

- Delete it and reference the backend repo's `docs/API.md` in the README
- Add a header at the top: `> This is a snapshot from YYYY-MM-DD. Source of
truth: brainclean_backend/docs/API.md`

### 10. Small nits

- Verify the base URL (`EXPO_PUBLIC_API_BASE_URL`) is set for prod builds too,
  not just dev
- If subscription poll only runs on Android foreground and iOS is a target,
  add iOS as well

---

## What NOT to do

- **Do not change any auth code** — JWT storage, sign-in flows, Bearer header
  injection are all correct. Leave them alone.
- **Do not add local subscription caching logic beyond React Query's defaults.**
  The backend `/subscriptions/status` is fast (single DB read); over-caching
  produces stale entitlement bugs.
- **Do not import subscription state from `expo-iap` for gating decisions.**
  Only use `expo-iap` for the purchase flow itself.
- **Do not silently swallow verify failures** — the user paid, they deserve a
  clear error and a support path.
- **Do not remove `finishTransaction` calls** — Play requires it even on failed
  server verification; otherwise the purchase stays pending and Play refunds
  after 3 days.

---

## Testing plan

After the changes:

1. **Admin user (backend-side) opens the app** — no paywall anywhere. Can create
   and start tasks freely.
2. **Grandfathered user (existing user with grace period)** — same as admin
   until the grace date passes.
3. **Fresh user, no subscription** — FAB shows paywall (fix #6). If they somehow
   reach the create/start API, they see 402 handled cleanly (fix #4).
4. **User with subscription, expires mid-session** — task start returns 402, app
   re-fetches status, pushes to paywall, does NOT logout (fixes #4 + #5).
5. **User buys subscription** — verify call returns `hasAccess=true`,
   `isPremium` flips, paywall closes.
6. **Verify fails after purchase** — user sees clear error, `isPremium` stays
   false, transaction is finished with Play, background refresh eventually
   reconciles (fix #3).
7. **User in IN_GRACE_PERIOD** — banner shows, but tasks still work (fix #7).
8. **User cancels but hasn't expired** — banner shows expiry date, tasks still
   work (fix #7).

---

## Acceptance criteria

- [ ] `types/subscription.ts` matches the shape in this doc exactly
- [ ] `isPremium` / paywall visibility derives from `hasAccess` (backend), not
      `expo-iap`
- [ ] Both task create and task start mutations handle 402 correctly:
      refresh status, push to paywall, do not logout
- [ ] `useSubscriptionStatusQuery` is either consumed or deleted
- [ ] Verify failure surfaces an error to the user and does not falsely mark
      them premium
- [ ] Verify success uses `hasAccess` from the response as truth
- [ ] `services/api/client.ts` has explicit branches for 401, 402, 403 with
      comments about why 402 doesn't logout
- [ ] Non-ACTIVE subscription states have UX treatment (banners / spinners)
- [ ] `TOKEN_EXPIRY_BUFFER_MS` is either wired up or deleted
- [ ] Existing tests pass; new tests added for the mutation 402 handling and
      the "verify fails but purchase still finishes" path
- [ ] Manual QA against the 8 test scenarios above
