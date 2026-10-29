import i18n from '@/i18n'
import { useThemeMode } from '@/hooks/useTheme'
import { Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StatusBar } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useUiStore } from '@/store/uiStore'

SplashScreen.preventAutoHideAsync()

// Accounts and analytics were removed. Wipe what older versions left behind:
// the sign-in token and email in SecureStore, and the queue of unsent
// analytics events in AsyncStorage. Deleting a missing key is a no-op.
function useClearLegacyData() {
	useEffect(() => {
		for (const key of ['user_token', 'user_email', 'user_token_expires_at']) {
			SecureStore.deleteItemAsync(key).catch(() => {})
		}
		AsyncStorage.removeItem('brainclean-analytics-queue').catch(() => {})
	}, [])
}

function useSyncLanguage() {
	useEffect(() => {
		const unsub = useUiStore.persist.onFinishHydration((state) => {
			if (state.selectedLanguage && state.selectedLanguage !== i18n.language) {
				i18n.changeLanguage(state.selectedLanguage)
			}
		})
		const state = useUiStore.getState()
		if (state.selectedLanguage && state.selectedLanguage !== i18n.language) {
			i18n.changeLanguage(state.selectedLanguage)
		}
		return unsub
	}, [])
}

export default function RootLayout() {
	useClearLegacyData()
	useSyncLanguage()
	const resolvedTheme = useThemeMode()

	return (
		<>
			<StatusBar
				barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
				backgroundColor='transparent'
				translucent
			/>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name='index' />
				<Stack.Screen name='(setup)' />
				<Stack.Screen name='(main)' />
			</Stack>
		</>
	)
}
