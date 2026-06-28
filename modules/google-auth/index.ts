import { requireNativeModule } from 'expo-modules-core';

const GoogleAuthModule = requireNativeModule('GoogleAuthModule');

export async function signInWithGoogle(): Promise<string> {
  return GoogleAuthModule.signInWithGoogle();
}
