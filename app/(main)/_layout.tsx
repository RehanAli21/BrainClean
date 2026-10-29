import { useNativeSync } from '@/hooks/useNativeSync'
import { useTaskReconcile } from '@/hooks/useTasks'
import { Stack } from 'expo-router'

export default function MainLayout() {
	useNativeSync()
	useTaskReconcile()

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(tabs)" />
		</Stack>
	)
}
