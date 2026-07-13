# BrainClean API Documentation

Base URL: `http://localhost:8080`

---

## Auth

All `/api/auth/**` endpoints are rate limited to **10 requests per minute per client IP**.
Exceeding the limit returns `429 Too Many Requests` with error code `RATE_LIMIT_EXCEEDED`
and a `Retry-After: 60` header.

### POST /api/auth/signup

Register a new user with email and password.

**Auth:** Public

**Request Body:**

| Field    | Type   | Validation            |
| -------- | ------ | --------------------- |
| email    | string | Required, valid email |
| username | string | Required, 3-50 chars  |
| password | string | Required, 8-128 chars |

**Example Request:**

```json
{
	"email": "user@example.com",
	"username": "johndoe",
	"password": "securepass123"
}
```

**Success Response:** `201 Created`

```json
{
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"expiresAt": "2026-04-27T12:00:00Z",
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"username": "johndoe",
		"emailVerified": false,
		"createdAt": "2026-03-28T12:00:00Z"
	}
}
```

`expiresAt` is the UTC instant when the JWT becomes invalid (30 days after issuance).

**Error Responses:**

| Status | Error Code              | When                        |
| ------ | ----------------------- | --------------------------- |
| 409    | EMAIL_ALREADY_EXISTS    | Email is already registered |
| 409    | USERNAME_ALREADY_EXISTS | Username is already taken   |
| 400    | VALIDATION_ERROR        | Invalid or missing fields   |

---

### POST /api/auth/login

Authenticate an existing user.

**Auth:** Public

**Request Body:**

| Field    | Type   | Validation            |
| -------- | ------ | --------------------- |
| email    | string | Required, valid email |
| password | string | Required              |

**Example Request:**

```json
{
	"email": "user@example.com",
	"password": "securepass123"
}
```

**Success Response:** `200 OK`

```json
{
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"expiresAt": "2026-04-27T12:00:00Z",
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"username": "johndoe",
		"emailVerified": false,
		"createdAt": "2026-03-28T12:00:00Z"
	}
}
```

`expiresAt` is the UTC instant when the JWT becomes invalid (30 days after issuance).

**Error Responses:**

| Status | Error Code          | When                         |
| ------ | ------------------- | ---------------------------- |
| 401    | INVALID_CREDENTIALS | Wrong email or password      |
| 403    | ACCOUNT_DEACTIVATED | Account has been deactivated |
| 400    | VALIDATION_ERROR    | Invalid or missing fields    |

---

### POST /api/auth/google

Sign in or sign up with a Google ID token (the JWT issued by Google's OAuth flow on
the client side). The backend verifies the token's signature, issuer, audience
(one of the configured Web or Android client IDs), and expiry. If the email is
already registered, signs the user in. Otherwise creates a new user with
`authProvider=GOOGLE` and a username auto-generated from the email prefix.

**Auth:** Public

**Request Body:**

| Field   | Type   | Validation                                                     |
| ------- | ------ | -------------------------------------------------------------- |
| idToken | string | Required. The ID token returned by Google's SDK on the client. |

**Example Request:**

```json
{
	"idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Success Response:** `200 OK`

Returns the same `AuthResponse` shape as `/api/auth/login`:

```json
{
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"expiresAt": "2026-04-27T12:00:00Z",
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@gmail.com",
		"username": "user",
		"emailVerified": true,
		"createdAt": "2026-03-28T12:00:00Z"
	}
}
```

**Error Responses:**

| Status | Error Code          | When                                                              |
| ------ | ------------------- | ----------------------------------------------------------------- |
| 401    | INVALID_ID_TOKEN    | Signature invalid, expired, wrong audience, or email not verified |
| 403    | ACCOUNT_DEACTIVATED | Email matches a user whose `isActive=false`                       |
| 400    | VALIDATION_ERROR    | Missing `idToken` field                                           |

**Required env vars (backend):**

- `GOOGLE_OAUTH_WEB_CLIENT_ID` — accept tokens from the Web OAuth client
- `GOOGLE_OAUTH_ANDROID_CLIENT_ID` — accept tokens from the Android OAuth client

At least one must be set, or the application fails to start.

---

### POST /api/auth/forgot-password

Request a password reset code. If the email is registered, a 6-digit code is sent to
that address. The response is intentionally generic and does **not** reveal whether
the email exists in the system.

**Auth:** Public

**Request Body:**

| Field | Type   | Validation            |
| ----- | ------ | --------------------- |
| email | string | Required, valid email |

**Example Request:**

```json
{
	"email": "user@example.com"
}
```

**Success Response:** `200 OK`

```json
{
	"message": "If an account exists for that email, a reset code has been sent."
}
```

The same response is returned whether or not the email is registered. The code is
delivered exclusively via email and expires after **15 minutes**.

**Error Responses:**

| Status | Error Code            | When                               |
| ------ | --------------------- | ---------------------------------- |
| 400    | VALIDATION_ERROR      | Missing email or invalid format    |
| 503    | EMAIL_DELIVERY_FAILED | SMTP error while sending the email |

---

### POST /api/auth/reset-password

Reset password using the 6-digit code that was sent to the user's email.

**Auth:** Public

**Request Body:**

| Field           | Type   | Validation                         |
| --------------- | ------ | ---------------------------------- |
| email           | string | Required, valid email              |
| code            | string | Required, exactly 6 digits         |
| newPassword     | string | Required, 8-128 chars              |
| confirmPassword | string | Required, must equal `newPassword` |

**Example Request:**

```json
{
	"email": "user@example.com",
	"code": "482915",
	"newPassword": "newsecurepass456",
	"confirmPassword": "newsecurepass456"
}
```

**Success Response:** `200 OK`

```json
{
	"message": "Password has been reset successfully"
}
```

**Error Responses:**

| Status | Error Code        | When                                                       |
| ------ | ----------------- | ---------------------------------------------------------- |
| 400    | INVALID_TOKEN     | Email/code combination is wrong or no code on file         |
| 400    | TOKEN_EXPIRED     | Reset code has expired (older than 15 minutes)             |
| 400    | PASSWORD_MISMATCH | `newPassword` and `confirmPassword` do not match           |
| 400    | VALIDATION_ERROR  | Missing/invalid email, non-6-digit code, or short password |

---

## Users

### DELETE /api/users/me

Permanently delete the authenticated user and **all** of their data:

- the user record itself
- all of the user's tasks

This operation is irreversible.

**Auth:** Authenticated

**Success Response:** `204 No Content`

**Error Responses:**

| Status | Error Code     | When                                  |
| ------ | -------------- | ------------------------------------- |
| 404    | USER_NOT_FOUND | User no longer exists in the database |
| 401    | —              | Missing or invalid JWT                |

---

## Subscriptions

BrainClean's paid features (task creation) require an active Google Play
subscription. All subscription state lives on Google's side; this backend just
verifies and caches.

### POST /api/subscriptions/verify

Verify a Google Play purchase and record its state on the backend. Called by
the mobile app right after a successful in-app purchase (or restore).

**Auth:** Authenticated

**Request Body:**

| Field         | Type   | Validation                                        |
| ------------- | ------ | ------------------------------------------------- |
| productId     | string | Required. The Play subscription product ID        |
| purchaseToken | string | Required. Token from `expo-iap`'s purchase result |

**Example Request:**

```json
{
	"productId": "brainclean_monthly",
	"purchaseToken": "iabc123...long-play-token"
}
```

**Success Response:** `200 OK`

Returns the current subscription status (same shape as `GET /status`).

```json
{
	"state": "ACTIVE",
	"hasAccess": true,
	"inTrial": true,
	"autoRenewing": true,
	"productId": "brainclean_monthly",
	"startsAt": "2026-06-27T10:00:00Z",
	"expiresAt": "2026-07-04T10:00:00Z"
}
```

**Error Responses:**

| Status | Error Code       | When                                                          |
| ------ | ---------------- | ------------------------------------------------------------- |
| 400    | INVALID_PURCHASE | Google Play rejected the token (fake, wrong package, revoked) |
| 400    | VALIDATION_ERROR | Missing/blank `productId` or `purchaseToken`                  |
| 401    | —                | Missing or invalid JWT                                        |

---

### GET /api/subscriptions/status

Returns the caller's current subscription state. Cheap read from the local DB —
no call to Google. RTDN webhooks (see below) keep the state fresh in the background.

**Auth:** Authenticated

**Example Response:** `200 OK`

If the user has never subscribed:

```json
{
	"state": "NONE",
	"hasAccess": false,
	"inTrial": false,
	"autoRenewing": false,
	"productId": null,
	"startsAt": null,
	"expiresAt": null
}
```

If subscribed:

```json
{
	"state": "ACTIVE",
	"hasAccess": true,
	"inTrial": false,
	"autoRenewing": true,
	"productId": "brainclean_monthly",
	"startsAt": "2026-06-27T10:00:00Z",
	"expiresAt": "2026-07-27T10:00:00Z"
}
```

Possible `state` values:

| State             | Meaning                                            | `hasAccess` |
| ----------------- | -------------------------------------------------- | ----------- |
| `NONE`            | User has never subscribed                          | false       |
| `PENDING`         | Purchase in progress (e.g. slow payment method)    | false       |
| `ACTIVE`          | Paying user, subscription valid                    | true        |
| `IN_GRACE_PERIOD` | Renewal failed, still access while Google retries  | true        |
| `CANCELED`        | User canceled, still has access until `expiresAt`  | true        |
| `ON_HOLD`         | Renewal failed past grace period, access suspended | false       |
| `PAUSED`          | User paused subscription                           | false       |
| `EXPIRED`         | Subscription ended, no access                      | false       |

Use `hasAccess` as the single source of truth for gating in the client.

#### Synthetic response for admin & grace-period users

`hasAccess` also folds in the same bypasses that the write endpoints (task
create/start) honor:

- **Admin users** (`is_admin = true`) with no purchase row → `state: "ACTIVE",
hasAccess: true, expiresAt: null`
- **Users still within their `subscription_grace_until` window** with no purchase
  row → `state: "ACTIVE", hasAccess: true, inTrial: true, expiresAt: <grace date>`
- **Admin or grace-period users who ALSO have a subscription row** → the real
  subscription state is returned, but `hasAccess` is forced `true` regardless

This means the client never has to reproduce the admin/grace logic — trust
`hasAccess`.

**Error Responses:**

| Status | Error Code | When                   |
| ------ | ---------- | ---------------------- |
| 401    | —          | Missing or invalid JWT |

---

### POST /api/subscriptions/webhook

Public endpoint for Google Cloud Pub/Sub push notifications (RTDN). Not called
by any client — only by Google's infrastructure.

**Every request goes through four security gates. All must pass.**

1. **Shared-secret token** — Pub/Sub is configured to push to
   `https://api.brainclean.app/api/subscriptions/webhook?token=<PLAY_PUBSUB_VERIFICATION_TOKEN>`.
   Missing/wrong `token` → `401`.
2. **Google-signed JWT** — the `Authorization: Bearer …` header must be a valid
   token issued by the configured Pub/Sub service account, with `aud` matching
   `PLAY_PUBSUB_AUDIENCE` and `email` matching `PLAY_PUBSUB_SA_EMAIL`. Invalid → `401`.
3. **Freshness** — messages with `publishTime` older than `pubsub-max-age-minutes`
   (default 60) are silently acked to prevent replay attacks.
4. **Idempotency** — the envelope's `messageId` is recorded in `pubsub_message_dedup`;
   re-delivery of the same messageId is silently acked without re-applying state.

**Request Body:** Pub/Sub push envelope (`{ message: { data: <base64-JSON>, messageId, publishTime } }`)
per [Google's spec](https://developer.android.com/google/play/billing/rtdn-reference).

**Success Response:** `200 OK` (empty body). Also returned for unactionable but
well-formed messages (test notifications, stale messages, duplicates) so Pub/Sub
doesn't retry unnecessarily.

**Error Responses:**

| Status | When                                                                        |
| ------ | --------------------------------------------------------------------------- |
| 401    | Missing/wrong `?token=` OR failed Google JWT verification                   |
| 400    | Body malformed or missing `purchaseToken` inside `subscriptionNotification` |
| 500    | Transient error while processing — Pub/Sub will retry per its retry policy  |
| 503    | Backend not configured (`PLAY_PUBSUB_VERIFICATION_TOKEN` unset)             |

---

## Tasks

### POST /api/tasks

Create a new task.

**Auth:** Authenticated

**Request Body:**

| Field                  | Type               | Validation                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                   | string             | Required, max 255 chars                                                                                                                                                                                                                                                                                                                                    |
| minimumDurationSeconds | integer            | Required, min 1                                                                                                                                                                                                                                                                                                                                            |
| maximumDurationSeconds | integer (nullable) | Optional. If set, must be `> minimumDurationSeconds`. When the task is started and this many seconds pass, the backend will auto-complete it (sets `completed=true`, `autoCompleted=true`). Omit (or send `null`) for no cap. The same field is returned on every task response: `null` if the task has no cap, otherwise the configured value in seconds. |

**Example Request:**

```json
{
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"maximumDurationSeconds": 3600
}
```

**Success Response:** `201 Created`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"maximumDurationSeconds": 3600,
	"started": false,
	"startedAt": null,
	"completed": false,
	"completedAt": null,
	"autoCompleted": false,
	"userCompleted": false,
	"createdAt": "2026-03-29T12:00:00Z"
}
```

> `maximumDurationSeconds` is `null` when the task was created without a cap.
> Tasks created before this feature shipped will all have `null` here.

**Error Responses:**

| Status | Error Code            | When                                                                        |
| ------ | --------------------- | --------------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR      | Invalid or missing fields                                                   |
| 400    | INVALID_DURATION      | `maximumDurationSeconds <= minimumDurationSeconds`                          |
| 402    | SUBSCRIPTION_REQUIRED | User has no active subscription/trial/grace/admin bypass                    |
| 409    | ACTIVE_TASK_EXISTS    | User already has a started, non-completed task (and it has not yet expired) |
| 401    | —                     | Missing or invalid JWT                                                      |

Both task **creation** and task **start** require an active subscription. The same
access rules described on `PATCH /api/tasks/{id}/start` apply here.

When `ACTIVE_TASK_EXISTS` is returned, the body includes a `details` object with the
active task's `id`, `name`, and `startedAt` so the client can show when the existing
task was started:

```json
{
	"error": "ACTIVE_TASK_EXISTS",
	"message": "Cannot create a new task while an active task exists",
	"details": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"name": "Meditate",
		"startedAt": "2026-06-19T10:00:00Z"
	}
}
```

The same `details` shape is included on every `409 ACTIVE_TASK_EXISTS` response —
on `PATCH /api/tasks/{id}/start` (the _other_ task that's blocking) and on
`DELETE /api/tasks/{id}` (the active task you tried to delete).

#### Auto-completion (max duration)

If a task is created with `maximumDurationSeconds` and is then started, the backend
will automatically mark it `completed` once that many seconds have elapsed since
`startedAt`. The auto-completion happens in two places:

1. **Periodic sweep** — a background job runs every **2 minutes** and bulk-completes
   any active tasks that have crossed their `maximumDurationSeconds`. Mobile sees the
   `completed: true` state on its next status poll and lifts the block.
2. **Inline check on writes** — if the user calls `POST /api/tasks`, `PATCH /tasks/{id}/start`,
   or `DELETE /tasks/{id}` while there's an active task that's already crossed its max,
   the backend auto-completes that active task in place before processing the new request
   (so users aren't blocked while waiting for the next sweep).

Each completed task carries two flags so you can tell _how_ it ended:

| Flag            | When it's `true`                                                 |
| --------------- | ---------------------------------------------------------------- |
| `completed`     | Always when the task is done, regardless of who/what finished it |
| `autoCompleted` | The system finished it (sweep or inline expiry)                  |
| `userCompleted` | The user finished it via `PATCH /api/tasks/{id}/complete`        |

`autoCompleted` and `userCompleted` are mutually exclusive — at most one is `true`.
Both stay `false` while the task is still active.

---

### GET /api/tasks

Get all tasks for the authenticated user. Optionally filter by date range.

**Auth:** Authenticated

**Query Parameters:**

| Param | Type   | Required | Description                                                     |
| ----- | ------ | -------- | --------------------------------------------------------------- |
| start | string | No       | ISO 8601 datetime — filter tasks created on or after this time  |
| end   | string | No       | ISO 8601 datetime — filter tasks created on or before this time |

Both `start` and `end` must be provided together. If omitted, all tasks are returned.

**Example Request:**

```
GET /api/tasks?start=2026-04-01T00:00:00Z&end=2026-04-02T00:00:00Z
```

**Example Response:** `200 OK`

```json
[
	{
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"name": "Read 10 pages",
		"minimumDurationSeconds": 600,
		"maximumDurationSeconds": 3600,
		"started": true,
		"startedAt": "2026-03-29T12:00:00Z",
		"completed": false,
		"completedAt": null,
		"autoCompleted": false,
		"userCompleted": false,
		"createdAt": "2026-04-01T10:00:00Z"
	}
]
```

Returns an empty array `[]` if the user has no tasks matching the criteria.

**Error Responses:**

| Status | Error Code       | When                                |
| ------ | ---------------- | ----------------------------------- |
| 400    | VALIDATION_ERROR | Malformed `start` or `end` datetime |
| 401    | —                | Missing or invalid JWT              |

---

### GET /api/tasks/by-date

Get all tasks for the authenticated user created on a specific date.

**Auth:** Authenticated

**Query Parameters:**

| Param | Type   | Required | Description                       |
| ----- | ------ | -------- | --------------------------------- |
| date  | string | Yes      | ISO 8601 date (e.g. `2026-04-04`) |

**Example Request:**

```
GET /api/tasks/by-date?date=2026-04-04
```

**Example Response:** `200 OK`

```json
[
	{
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"name": "Read 10 pages",
		"minimumDurationSeconds": 600,
		"maximumDurationSeconds": 3600,
		"started": false,
		"startedAt": null,
		"completed": false,
		"completedAt": null,
		"autoCompleted": false,
		"userCompleted": false,
		"createdAt": "2026-04-04T10:00:00Z"
	}
]
```

Returns an empty array `[]` if no tasks were created on that date.

**Error Responses:**

| Status | Error Code       | When                          |
| ------ | ---------------- | ----------------------------- |
| 400    | VALIDATION_ERROR | Missing or invalid date param |
| 401    | —                | Missing or invalid JWT        |

---

### GET /api/tasks/status-counts

Get counts of tasks grouped by status for the authenticated user.

**Auth:** Authenticated

**Example Response:** `200 OK`

```json
{
	"pending": 3,
	"active": 1,
	"completed": 5,
	"total": 9
}
```

- **pending** — created but not yet started
- **active** — started but not yet completed
- **completed** — marked as completed
- **total** — sum of the above

**Error Responses:**

| Status | Error Code | When                   |
| ------ | ---------- | ---------------------- |
| 401    | —          | Missing or invalid JWT |

---

### GET /api/tasks/{id}

Get a single task by ID. Only returns tasks owned by the authenticated user.

**Auth:** Authenticated

**Example Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"maximumDurationSeconds": 3600,
	"started": false,
	"startedAt": null,
	"completed": false,
	"completedAt": null,
	"autoCompleted": false,
	"userCompleted": false,
	"createdAt": "2026-03-29T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code     | When                                     |
| ------ | -------------- | ---------------------------------------- |
| 404    | TASK_NOT_FOUND | Task does not exist or not owned by user |
| 401    | —              | Missing or invalid JWT                   |

---

### DELETE /api/tasks/{id}

Delete a task. Only deletes tasks owned by the authenticated user. Cannot delete a started, non-completed task.

**Auth:** Authenticated

**Success Response:** `204 No Content`

**Error Responses:**

| Status | Error Code         | When                                     |
| ------ | ------------------ | ---------------------------------------- |
| 404    | TASK_NOT_FOUND     | Task does not exist or not owned by user |
| 409    | ACTIVE_TASK_EXISTS | Task is started and not yet completed    |
| 401    | —                  | Missing or invalid JWT                   |

---

### PATCH /api/tasks/{id}/start

Start a task. Sets `startedAt` to the server clock. Only one task can be active (started and not completed) at a time.
Called from mobile to begin app blocking.

**Auth:** Authenticated

**Example Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"maximumDurationSeconds": 3600,
	"started": true,
	"startedAt": "2026-03-29T12:00:00Z",
	"completed": false,
	"completedAt": null,
	"autoCompleted": false,
	"userCompleted": false,
	"createdAt": "2026-03-29T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code             | When                                                     |
| ------ | ---------------------- | -------------------------------------------------------- |
| 402    | SUBSCRIPTION_REQUIRED  | User has no active subscription/trial/grace/admin bypass |
| 404    | TASK_NOT_FOUND         | Task does not exist or not owned by user                 |
| 409    | ACTIVE_TASK_EXISTS     | Another task is already started and active               |
| 409    | TASK_ALREADY_STARTED   | Task has already been started                            |
| 409    | TASK_ALREADY_COMPLETED | Task has already been completed                          |
| 401    | —                      | Missing or invalid JWT                                   |

**Access rules** (checked in this order, first match wins):

1. Admin users (`is_admin = true`) always pass
2. Users still within their `subscription_grace_until` window pass (existing users
   were granted a 1-month grace period when subscriptions launched)
3. Users with an ACTIVE, IN_GRACE_PERIOD, or CANCELED-but-still-before-expiry
   subscription pass
4. Otherwise → `402 SUBSCRIPTION_REQUIRED`

---

### PATCH /api/tasks/{id}/complete

Mark a task as completed. The task must be started and the minimum duration must have elapsed since `startedAt` (
server-side check).

**Auth:** Authenticated

**Example Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"maximumDurationSeconds": 3600,
	"started": true,
	"startedAt": "2026-03-29T12:00:00Z",
	"completed": true,
	"completedAt": "2026-03-29T12:10:00Z",
	"autoCompleted": false,
	"userCompleted": false,
	"createdAt": "2026-03-29T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code             | When                                                  |
| ------ | ---------------------- | ----------------------------------------------------- |
| 404    | TASK_NOT_FOUND         | Task does not exist or not owned by user              |
| 409    | TASK_NOT_ELIGIBLE      | Task not started, or minimum duration not yet reached |
| 409    | TASK_ALREADY_COMPLETED | Task has already been completed                       |
| 401    | —                      | Missing or invalid JWT                                |

---

## Wishlist

### POST /api/wishlist/join

Add an email to the wishlist. Idempotent: if the email already exists, the existing
entry is returned with the same `201 Created` response (no error).

**Auth:** Public

**Request Body:**

| Field    | Type   | Validation                     |
| -------- | ------ | ------------------------------ |
| email    | string | Required, valid email, max 255 |
| location | string | Optional, max 255 chars        |

**Example Request:**

```json
{
	"email": "user@example.com",
	"location": "Karachi, PK"
}
```

**Success Response:** `201 Created`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"email": "user@example.com",
	"location": "Karachi, PK",
	"createdAt": "2026-05-03T12:00:00Z"
}
```

If the email is already on the wishlist, the same `201 Created` response is returned
with the originally stored `location` and `createdAt` (the new request's `location`
is ignored).

**Error Responses:**

| Status | Error Code       | When                                      |
| ------ | ---------------- | ----------------------------------------- |
| 400    | VALIDATION_ERROR | Missing email, invalid email, or too long |

---

## Error Response Format

All errors follow a consistent shape:

```json
{
	"error": "ERROR_CODE",
	"message": "Human-readable description"
}
```
