import { Colors } from '@/constants/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ExpoInAppUpdates from 'expo-in-app-updates'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View, type AppStateStatus } from 'react-native'
import { isBlocking as nativeIsBlocking } from '@/modules/blocker'
import { AuthProvider } from '../context/AuthContext'

SplashScreen.preventAutoHideAsync()

function useAppStateFocusManager() {
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
			focusManager.setFocused(status === 'active')
		})
		return () => subscription.remove()
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
	const theme = Colors.dark
	return (
		<View style={[updateStyles.container, { backgroundColor: theme.background }]}>
			<View style={[updateStyles.iconCircle, { backgroundColor: theme.primary + '1A' }]}>
				<Ionicons name='cloud-download-outline' size={56} color={theme.primary} />
			</View>
			<Text style={[updateStyles.title, { color: theme.text }]}>Update Required</Text>
			<Text style={[updateStyles.message, { color: theme.icon }]}>
				A new version of BrainClean is available. Please update to continue using the app.
			</Text>
			<TouchableOpacity
				style={[updateStyles.button, { backgroundColor: theme.primary }]}
				onPress={onRetry}
				activeOpacity={0.8}>
				<Ionicons name='download-outline' size={20} color='#FFFFFF' />
				<Text style={updateStyles.buttonText}>Update Now</Text>
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

export default function RootLayout() {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: true,
					},
				},
			}),
	)

	useAppStateFocusManager()
	const { updateRequired, retry } = useForceUpdate()

	if (updateRequired) {
		return <UpdateBlocker onRetry={retry} />
	}

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name='index' />
					<Stack.Screen name='auth/login' />
					<Stack.Screen name='(setup)' />
					<Stack.Screen name='(main)' />
				</Stack>
			</AuthProvider>
		</QueryClientProvider>
	)
}
