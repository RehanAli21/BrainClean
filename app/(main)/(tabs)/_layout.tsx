import { LanguagePicker } from '@/components/LanguagePicker'
import { TutorialOverlay } from '@/components/TutorialOverlay'
import { WalkthroughOverlay } from '@/components/WalkthroughOverlay'
import { onShowWalkthrough } from '@/components/walkthroughRegistry'
import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function TabsLayout() {
	const theme = useTheme()
	const { t } = useTranslation()
	const tutorialSeen = useUiStore(s => s.tutorialSeen)
	const selectedLanguage = useUiStore(s => s.selectedLanguage)
	const [showLanguagePicker, setShowLanguagePicker] = useState(selectedLanguage === null)
	const [showTutorial, setShowTutorial] = useState(false)
	const [showWalkthrough, setShowWalkthrough] = useState(false)

	useEffect(() => {
		onShowWalkthrough(() => setShowWalkthrough(true))
		return () => onShowWalkthrough(null)
	}, [])

	const handleLanguagePickerClose = () => {
		setShowLanguagePicker(false)
		if (!tutorialSeen) {
			setShowTutorial(true)
		}
	}

	return (
		<>
			<LanguagePicker
				visible={showLanguagePicker}
				onClose={handleLanguagePickerClose}
				dismissable={false}
			/>
			<TutorialOverlay
				visible={!showLanguagePicker && showTutorial}
				onClose={() => setShowTutorial(false)}
			/>
			<WalkthroughOverlay
				visible={showWalkthrough}
				onClose={() => setShowWalkthrough(false)}
			/>
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
					name='wellness'
					options={{
						title: t('tabs.wellness'),
						tabBarIcon: ({ color, size }) => (
							<Ionicons
								name='leaf-outline'
								size={size}
								color={color}
							/>
						),
					}}
				/>
				<Tabs.Screen
					name='tasks'
					options={{
						title: t('tabs.tasks'),
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
						title: t('tabs.apps'),
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
						title: t('tabs.settings'),
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
