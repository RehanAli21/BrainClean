import React, { useCallback, useRef } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Colors } from '../constants/theme'

interface PrimaryButtonProps {
	title: string
	onPress: () => void
	isLoading?: boolean
	disabled?: boolean
}

export function PrimaryButton({ title, onPress, isLoading, disabled }: PrimaryButtonProps) {
	const theme = Colors.dark
	const cooldownRef = useRef(false)

	const handlePress = useCallback(() => {
		if (cooldownRef.current) return
		cooldownRef.current = true
		onPress()
		setTimeout(() => { cooldownRef.current = false }, 1000)
	}, [onPress])

	return (
		<TouchableOpacity
			style={[styles.button, { backgroundColor: theme.primary }, (isLoading || disabled) && styles.disabled]}
			onPress={handlePress}
			disabled={isLoading || disabled || cooldownRef.current}
			activeOpacity={0.8}>
			{isLoading ? <ActivityIndicator color='#FFF' /> : <Text style={styles.text}>{title}</Text>}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	button: {
		height: 52,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		marginBottom: 16,
		shadowColor: '#2563EB', // Electric Blue Glow
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	text: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	disabled: {
		opacity: 0.6,
	},
})
