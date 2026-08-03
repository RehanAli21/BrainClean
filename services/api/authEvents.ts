import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// Bridges the axios interceptor (no React context access) to AuthContext's
// logout, so a 401 clears React state too — otherwise the route-protection
// effect sees a stale token and bounces the user straight back off the login
// screen in an endless redirect loop.

type LogoutHandler = () => void | Promise<void>;

let handler: LogoutHandler | null = null;
let loggingOut = false;

export function registerLogoutHandler(h: LogoutHandler): void {
  handler = h;
}

export async function triggerLogout(): Promise<void> {
  // Parallel 401s from simultaneous queries must only log out once.
  if (loggingOut) return;
  loggingOut = true;
  try {
    if (handler) {
      await handler();
    } else {
      // AuthProvider not mounted (should not happen in practice) — fall back
      // to clearing storage and navigating directly.
      await SecureStore.deleteItemAsync('user_token');
      await SecureStore.deleteItemAsync('user_email');
      await SecureStore.deleteItemAsync('user_token_expires_at');
      router.replace('/(main)/(tabs)/wellness');
    }
  } finally {
    setTimeout(() => {
      loggingOut = false;
    }, 1000);
  }
}
