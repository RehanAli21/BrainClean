import React from 'react'
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'
import { Colors } from '../constants/theme'

interface AuthInputProps extends TextInputProps {
	label: string
	isPassword?: boolean
}

export function AuthInput({ label, isPassword = false, ...props }: AuthInputProps) {
	// Assuming Dark Mode based on your palette choice
	const theme = Colors.dark

	return (
		<View style={styles.container}>
			<Text style={[styles.label, { color: theme.icon }]}>{label}</Text>
			<TextInput
				style={[
					styles.input,
					{
						backgroundColor: theme.surface,
						borderColor: theme.border,
						color: theme.text,
					},
				]}
				placeholderTextColor={theme.icon}
				secureTextEntry={isPassword}
				{...props}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		width: '100%',
	},
	label: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	input: {
		height: 50,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		fontSize: 16,
	},
})
