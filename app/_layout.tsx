import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout() {
	const [queryClient] = useState(() => new QueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name='index' />
					<Stack.Screen name='auth/login' />
					<Stack.Screen name='(main)' />
				</Stack>
			</AuthProvider>
		</QueryClientProvider>
	)
}
