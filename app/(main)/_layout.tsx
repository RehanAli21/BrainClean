import { useNativeSync } from '@/hooks/useNativeSync'
import { usePermissions } from '@/hooks/usePermissions'
import { useUiStore } from '@/store/uiStore'
import { Redirect, Stack } from 'expo-router'

export default function MainLayout() {
	const { allGranted, isLoading } = usePermissions()
	const setupCompleted = useUiStore(s => s.setupCompleted)
	useNativeSync()

	// First launch: the permission wizard must run before anything else.
	// Once completed it never gates again — revoked permissions are handled
	// by the grant buttons in Settings and the start-task checks.
	if (!isLoading && !allGranted && !setupCompleted) {
		return <Redirect href='/(setup)/permissions' />
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="paywall" />
		</Stack>
	)
}
