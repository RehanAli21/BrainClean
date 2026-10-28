import i18n from '@/i18n'
import { useTheme, useThemeMode } from '@/hooks/useTheme'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as ExpoInAppUpdates from 'expo-in-app-updates'
import { Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as SplashScreen from 'expo-splash-screen'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View, type AppStateStatus } from 'react-native'
import { useTranslation } from 'react-i18next'
import { isBlocking as nativeIsBlocking } from '@/modules/blocker'
import { analytics } from '@/services/analytics'
import { useUiStore } from '@/store/uiStore'

SplashScreen.preventAutoHideAsync()

function useAnalytics() {
	useEffect(() => {
		analytics.init()
		analytics.track('app_opened')
		const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
			if (status === 'active') analytics.track('app_opened')
		})
		return () => sub.remove()
	}, [])
}

// Accounts were removed. Wipe the sign-in token and email that versions with
// login left in SecureStore. Deleting a missing key is a no-op.
function useClearLegacyAuth() {
	useEffect(() => {
		for (const key of ['user_token', 'user_email', 'user_token_expires_at']) {
			SecureStore.deleteItemAsync(key).catch(() => {})
		}
	}, [])
}

function useForceUpdate() {
	const [updateRequired, setUpdateRequired] = useState(false)

	const checkUpdate = useCallback(async () => {
		if (__DEV__ || Platform.OS === 'web') return
		if (nativeIsBlocking()) return
		try {
			const result = await ExpoInAppUpdates.checkForUpdate()
			if (result.updateAvailable) {
				try {
					await ExpoInAppUpdates.startUpdate(true)
				} catch {
					setUpdateRequired(true)
				}
			}
		} catch {}
	}, [])

	useEffect(() => {
		checkUpdate()
	}, [checkUpdate])

	useEffect(() => {
		if (!updateRequired) return
		const remove = ExpoInAppUpdates.addUpdateListener('updateCancelled', () => {
			setUpdateRequired(true)
		})
		return remove
	}, [updateRequired])

	const retry = useCallback(async () => {
		try {
			await ExpoInAppUpdates.startUpdate(Platform.OS === 'android')
		} catch {}
	}, [])

	return { updateRequired, retry }
}

function UpdateBlocker({ onRetry }: { onRetry: () => void }) {
	const theme = useTheme()
	const { t } = useTranslation()
	return (
		<View style={[updateStyles.container, { backgroundColor: theme.background }]}>
			<View style={[updateStyles.iconCircle, { backgroundColor: theme.primary + '1A' }]}>
				<Ionicons name='cloud-download-outline' size={56} color={theme.primary} />
			</View>
			<Text style={[updateStyles.title, { color: theme.text }]}>{t('update.title')}</Text>
			<Text style={[updateStyles.message, { color: theme.icon }]}>
				{t('update.message')}
			</Text>
			<TouchableOpacity
				style={[updateStyles.button, { backgroundColor: theme.primary }]}
				onPress={onRetry}
				activeOpacity={0.8}>
				<Ionicons name='download-outline' size={20} color='#FFFFFF' />
				<Text style={updateStyles.buttonText}>{t('update.button')}</Text>
			</TouchableOpacity>
		</View>
	)
}

const updateStyles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	iconCircle: {
		width: 120,
		height: 120,
		borderRadius: 60,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 12,
	},
	message: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
		marginBottom: 32,
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 52,
		borderRadius: 12,
		paddingHorizontal: 32,
	},
	buttonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
})

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
	useClearLegacyAuth()
	useSyncLanguage()
	useAnalytics()
	const resolvedTheme = useThemeMode()
	const { updateRequired, retry } = useForceUpdate()

	if (updateRequired) {
		return <UpdateBlocker onRetry={retry} />
	}

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
