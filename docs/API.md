# GrayGuard API Documentation

Base URL: `http://localhost:8080`

---

## Auth

### POST /api/auth/signup

Register a new user with email and password.

**Auth:** Public

**Request Body:**

| Field    | Type   | Validation               |
|----------|--------|--------------------------|
| email    | string | Required, valid email    |
| username | string | Required, 3-50 chars     |
| password | string | Required, 8-128 chars    |

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
|--------|-------------------------|-----------------------------|
| 409    | EMAIL_ALREADY_EXISTS    | Email is already registered |
| 409    | USERNAME_ALREADY_EXISTS | Username is already taken   |
| 400    | VALIDATION_ERROR        | Invalid or missing fields   |

---

### POST /api/auth/login

Authenticate an existing user.

**Auth:** Public

**Request Body:**

| Field    | Type   | Validation            |
|----------|--------|-----------------------|
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

| Status | Error Code          | When                              |
|--------|---------------------|-----------------------------------|
| 401    | INVALID_CREDENTIALS | Wrong email or password           |
| 403    | ACCOUNT_DEACTIVATED | Account has been deactivated      |
| 400    | VALIDATION_ERROR    | Invalid or missing fields         |

---

### POST /api/auth/forgot-password

Request a password reset token. In v1, the token is returned directly in the response (no email sent).

**Auth:** Public

**Request Body:**

| Field | Type   | Validation            |
|-------|--------|-----------------------|
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

| Status | Error Code       | When                              |
|--------|------------------|-----------------------------------|
| 404    | USER_NOT_FOUND   | No account found with this email  |
| 400    | VALIDATION_ERROR | Invalid or missing fields         |

---

### POST /api/auth/reset-password

Reset password using a valid reset token.

**Auth:** Public

**Request Body:**

| Field       | Type   | Validation            |
|-------------|--------|-----------------------|
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

| Status | Error Code       | When                          |
|--------|------------------|-------------------------------|
| 400    | INVALID_TOKEN    | Token not found or invalid    |
| 400    | TOKEN_EXPIRED    | Reset token has expired       |
| 400    | VALIDATION_ERROR | Invalid or missing fields     |

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```
