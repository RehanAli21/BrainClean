import { Colors } from '@/constants/theme'
import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native'

export default function Index() {
	const colorScheme = useColorScheme() ?? 'dark' // Defaulting to dark for the "Vibe" check
	const theme = Colors[colorScheme]
	const styles = useMemo(() => createStyles(theme), [theme])

	return (
		<View style={styles.container}>
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.iconPlaceholder} />
				<Text style={styles.title}>GrayGuard</Text>
			</View>

			{/* Main Status Card */}
			<View style={styles.card}>
				<Text style={styles.cardLabel}>STATUS</Text>
				<Text style={styles.cardValue}>Active Protection</Text>
				<Text style={styles.cardSub}>You are currently in a focus block.</Text>
			</View>

			{/* Action Button */}
			<TouchableOpacity style={styles.button}>
				<Text style={styles.buttonText}>Open Dashboard</Text>
			</TouchableOpacity>
		</View>
	)
}

const createStyles = (theme: typeof Colors.dark) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background, // Deep Void
			paddingHorizontal: 24,
			justifyContent: 'center',
		},
		header: {
			alignItems: 'center',
			marginBottom: 40,
		},
		iconPlaceholder: {
			width: 60,
			height: 60,
			borderRadius: 16,
			backgroundColor: theme.surface,
			borderWidth: 1,
			borderColor: theme.border,
			marginBottom: 16,
		},
		title: {
			fontSize: 28,
			fontWeight: '700',
			color: theme.text,
			letterSpacing: -0.5,
		},
		card: {
			backgroundColor: theme.surface,
			padding: 24,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.border,
			marginBottom: 24,
			// Subtle shadow for depth
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: 0.3,
			shadowRadius: 20,
			elevation: 5,
		},
		cardLabel: {
			color: theme.accent, // Rose Alert
			fontSize: 12,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 1,
			marginBottom: 8,
		},
		cardValue: {
			color: theme.text,
			fontSize: 22,
			fontWeight: '600',
			marginBottom: 8,
		},
		cardSub: {
			color: theme.icon,
			fontSize: 14,
			lineHeight: 20,
		},
		button: {
			backgroundColor: theme.primary, // Electric Blue
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: 'center',
		},
		buttonText: {
			color: '#FFFFFF',
			fontSize: 16,
			fontWeight: '600',
		},
	})
