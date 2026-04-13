import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
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

export default function RootLayout() {
	const [queryClient] = useState(() => new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: true,
			},
		},
	}))

	useAppStateFocusManager()

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
