import { AntDesign } from '@expo/vector-icons' // Standard Expo Icons
import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Colors } from '../constants/theme'

interface SocialButtonProps {
	title: string
	onPress: () => void
	iconName?: keyof typeof AntDesign.glyphMap
}

export function SocialButton({ title, onPress, iconName = 'google' }: SocialButtonProps) {
	const theme = Colors.dark

	return (
		<TouchableOpacity
			style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}
			onPress={onPress}>
			<AntDesign
				name={iconName}
				size={20}
				color={theme.text}
				style={styles.icon}
			/>
			<Text style={[styles.text, { color: theme.text }]}>{title}</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	button: {
		height: 52,
		borderRadius: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		borderWidth: 1,
		marginBottom: 16,
	},
	icon: {
		marginRight: 12,
	},
	text: {
		fontSize: 16,
		fontWeight: '600',
	},
})
