# BrainClean API Documentation

Base URL: `http://localhost:8080`

---

## Auth

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
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"username": "johndoe",
		"emailVerified": false,
		"createdAt": "2026-03-28T12:00:00Z"
	}
}
```

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
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"username": "johndoe",
		"emailVerified": false,
		"createdAt": "2026-03-28T12:00:00Z"
	}
}
```

**Error Responses:**

| Status | Error Code          | When                         |
| ------ | ------------------- | ---------------------------- |
| 401    | INVALID_CREDENTIALS | Wrong email or password      |
| 403    | ACCOUNT_DEACTIVATED | Account has been deactivated |
| 400    | VALIDATION_ERROR    | Invalid or missing fields    |

---

### POST /api/auth/forgot-password

Request a password reset token. In v1, the token is returned directly in the response (no email sent).

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
	"resetToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	"expiresAt": "2026-03-28T13:00:00Z"
}
```

**Error Responses:**

| Status | Error Code       | When                             |
| ------ | ---------------- | -------------------------------- |
| 404    | USER_NOT_FOUND   | No account found with this email |
| 400    | VALIDATION_ERROR | Invalid or missing fields        |

---

### POST /api/auth/reset-password

Reset password using a valid reset token.

**Auth:** Public

**Request Body:**

| Field       | Type   | Validation            |
| ----------- | ------ | --------------------- |
| token       | string | Required              |
| newPassword | string | Required, 8-128 chars |

**Example Request:**

```json
{
	"token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	"newPassword": "newsecurepass456"
}
```

**Success Response:** `200 OK`

```json
{
	"message": "Password has been reset successfully"
}
```

**Error Responses:**

| Status | Error Code       | When                       |
| ------ | ---------------- | -------------------------- |
| 400    | INVALID_TOKEN    | Token not found or invalid |
| 400    | TOKEN_EXPIRED    | Reset token has expired    |
| 400    | VALIDATION_ERROR | Invalid or missing fields  |

---

## Tasks

### POST /api/tasks

Create a new task.

**Auth:** Authenticated

**Request Body:**

| Field                  | Type    | Validation              |
| ---------------------- | ------- | ----------------------- |
| name                   | string  | Required, max 255 chars |
| minimumDurationSeconds | integer | Required, min 1         |

**Example Request:**

```json
{
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600
}
```

**Success Response:** `201 Created`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"started": false,
	"startedAt": null,
	"completed": false,
	"completedAt": null,
	"createdAt": "2026-03-29T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code         | When                                           |
| ------ | ------------------ | ---------------------------------------------- |
| 400    | VALIDATION_ERROR   | Invalid or missing fields                      |
| 409    | ACTIVE_TASK_EXISTS | User already has a started, non-completed task |
| 401    | —                  | Missing or invalid JWT                         |

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
		"started": true,
		"startedAt": "2026-03-29T12:00:00Z",
		"completed": false,
		"completedAt": null,
		"createdAt": "2026-04-01T10:00:00Z"
	}
]
```

Returns an empty array `[]` if the user has no tasks matching the criteria.

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
		"started": false,
		"startedAt": null,
		"completed": false,
		"completedAt": null,
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
	"started": false,
	"startedAt": null,
	"completed": false,
	"completedAt": null,
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

Start a task. Sets `startedAt` to the server clock. Only one task can be active (started and not completed) at a time. Called from mobile to begin app blocking.

**Auth:** Authenticated

**Example Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"started": true,
	"startedAt": "2026-03-29T12:00:00Z",
	"completed": false,
	"completedAt": null,
	"createdAt": "2026-03-29T12:00:00Z"
}
```

**Error Responses:**

| Status | Error Code             | When                                       |
| ------ | ---------------------- | ------------------------------------------ |
| 404    | TASK_NOT_FOUND         | Task does not exist or not owned by user   |
| 409    | ACTIVE_TASK_EXISTS     | Another task is already started and active |
| 409    | TASK_ALREADY_STARTED   | Task has already been started              |
| 409    | TASK_ALREADY_COMPLETED | Task has already been completed            |
| 401    | —                      | Missing or invalid JWT                     |

---

### PATCH /api/tasks/{id}/complete

Mark a task as completed. The task must be started and the minimum duration must have elapsed since `startedAt` (server-side check). In the future, this will also require a valid QR token.

**Auth:** Authenticated

**Example Response:** `200 OK`

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "Read 10 pages",
	"minimumDurationSeconds": 600,
	"started": true,
	"startedAt": "2026-03-29T12:00:00Z",
	"completed": true,
	"completedAt": "2026-03-29T12:10:00Z",
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

## Error Response Format

All errors follow a consistent shape:

```json
{
	"error": "ERROR_CODE",
	"message": "Human-readable description"
}
```
