import { useNativeSync } from '@/hooks/useNativeSync'
import { Stack } from 'expo-router'

export default function MainLayout() {
	useNativeSync()

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="paywall" />
		</Stack>
	)
}
