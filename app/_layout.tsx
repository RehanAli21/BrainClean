import { Stack } from 'expo-router'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout() {
	return (
		// Wrap the entire app
		<AuthProvider>
			<Stack screenOptions={{ headerShown: false }}>
				{/* We keep index as a 'Splash' or 'Loading' state if needed, 
           but the AuthContext will immediately redirect away from it.
        */}
				<Stack.Screen name='index' />
				<Stack.Screen name='auth/login' />
				<Stack.Screen name='main' />
			</Stack>
		</AuthProvider>
	)
}
