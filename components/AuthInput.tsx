import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'
import { Colors } from '../constants/theme'

interface AuthInputProps extends TextInputProps {
	label: string
	isPassword?: boolean
}

export function AuthInput({ label, isPassword = false, ...props }: AuthInputProps) {
	const theme = Colors.dark
	const [isVisible, setIsVisible] = useState(false)

	return (
		<View style={styles.container}>
			<Text style={[styles.label, { color: theme.icon }]}>{label}</Text>
			<View
				style={[
					styles.inputWrapper,
					{ backgroundColor: theme.surface, borderColor: theme.border },
				]}>
				<TextInput
					style={[styles.input, { color: theme.text }, isPassword && styles.inputWithToggle]}
					placeholderTextColor={theme.icon}
					secureTextEntry={isPassword && !isVisible}
					{...props}
				/>
				{isPassword ? (
					<Pressable
						onPress={() => setIsVisible(prev => !prev)}
						hitSlop={8}
						style={styles.toggle}
						accessibilityRole='button'
						accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}>
						<Ionicons
							name={isVisible ? 'eye-off-outline' : 'eye-outline'}
							size={22}
							color={theme.icon}
						/>
					</Pressable>
				) : null}
			</View>
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
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 50,
		borderWidth: 1,
		borderRadius: 12,
	},
	input: {
		flex: 1,
		height: '100%',
		paddingHorizontal: 16,
		fontSize: 16,
	},
	inputWithToggle: {
		paddingRight: 8,
	},
	toggle: {
		paddingHorizontal: 14,
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
})
