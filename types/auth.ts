/** User object returned by auth endpoints */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  createdAt: string;
}

/** Response from POST /api/auth/login and POST /api/auth/signup */
export interface AuthResponse {
  token: string;
  /** UTC ISO timestamp when the JWT becomes invalid */
  expiresAt: string;
  user: AuthUser;
}

/** Response from POST /api/auth/forgot-password */
export interface ForgotPasswordResponse {
  message: string;
}

/** Response from POST /api/auth/reset-password */
export interface ResetPasswordResponse {
  message: string;
}
