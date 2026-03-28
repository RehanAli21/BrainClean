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
  user: AuthUser;
}

/** Response from POST /api/auth/forgot-password */
export interface ForgotPasswordResponse {
  resetToken: string;
  expiresAt: string;
}

/** Response from POST /api/auth/reset-password */
export interface ResetPasswordResponse {
  message: string;
}
