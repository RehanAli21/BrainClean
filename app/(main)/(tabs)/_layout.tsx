import { TutorialOverlay } from '@/components/TutorialOverlay'
import { WalkthroughOverlay } from '@/components/WalkthroughOverlay'
import { onShowWalkthrough } from '@/components/walkthroughRegistry'
import { Colors } from '@/constants/theme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import React, { useEffect, useState } from 'react'

export default function TabsLayout() {
	const theme = Colors.dark
	const tutorialSeen = useUiStore(s => s.tutorialSeen)
	const [showTutorial, setShowTutorial] = useState(!tutorialSeen)
	const [showWalkthrough, setShowWalkthrough] = useState(false)

	useEffect(() => {
		onShowWalkthrough(() => setShowWalkthrough(true))
		return () => onShowWalkthrough(null)
	}, [])

	return (
		<>
		<TutorialOverlay visible={showTutorial} onClose={() => setShowTutorial(false)} />
		<WalkthroughOverlay visible={showWalkthrough} onClose={() => setShowWalkthrough(false)} />
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: theme.background,
					borderTopColor: theme.border,
					borderTopWidth: 1,
				},
				tabBarActiveTintColor: theme.tabIconSelected,
				tabBarInactiveTintColor: theme.tabIconDefault,
			}}>
			<Tabs.Screen
				name='tasks'
				options={{
					title: 'Tasks',
					tabBarIcon: ({ color, size }) => (
						<Ionicons
							name='checkmark-circle-outline'
							size={size}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name='apps'
				options={{
					title: 'Apps',
					tabBarIcon: ({ color, size }) => (
						<Ionicons
							name='grid-outline'
							size={size}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name='settings'
				options={{
					title: 'Settings',
					tabBarIcon: ({ color, size }) => (
						<Ionicons
							name='settings-outline'
							size={size}
							color={color}
						/>
					),
				}}
			/>
		</Tabs>
		</>
	)
}
