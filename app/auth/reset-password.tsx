import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { authService } from '@/services/api/auth'
import { Ionicons } from '@expo/vector-icons'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

const resetSchema = z
	.object({
		code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must be 6 digits'),
		newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
		confirmPassword: z.string(),
	})
	.refine(data => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

export default function ResetPasswordScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const { email } = useLocalSearchParams<{ email: string }>()
	const [code, setCode] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [success, setSuccess] = useState(false)

	const handleReset = async () => {
		setErrors({})
		setApiError('')

		const result = resetSchema.safeParse({ code, newPassword, confirmPassword })
		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of result.error.issues) {
				const key = issue.path[0] as string
				if (!fieldErrors[key]) fieldErrors[key] = issue.message
			}
			setErrors(fieldErrors)
			return
		}

		if (!email) {
			setApiError('Email is missing. Please go back and try again.')
			return
		}

		setIsLoading(true)
		try {
			await authService.resetPassword(email, code, newPassword, confirmPassword)
			setSuccess(true)
		} catch (err: any) {
			const code = err.response?.data?.error
			if (code === 'INVALID_TOKEN') {
				setApiError('Invalid code. Please check and try again.')
			} else if (code === 'TOKEN_EXPIRED') {
				setApiError('This code has expired. Please request a new one.')
			} else if (code === 'PASSWORD_MISMATCH') {
				setApiError('Passwords do not match.')
			} else if (code === 'VALIDATION_ERROR') {
				setApiError(err.response?.data?.message || 'Invalid input.')
			} else {
				setApiError('Something went wrong. Please try again.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	if (success) {
		return (
			<View style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={styles.successContent}>
					<Ionicons
						name='checkmark-circle'
						size={64}
						color='#10B981'
					/>
					<Text style={[styles.title, { color: theme.text, marginTop: 16 }]}>Password Reset</Text>
					<Text style={[styles.subtitle, { color: theme.icon, textAlign: 'center' }]}>
						Your password has been reset successfully. You can now sign in with your new password.
					</Text>
					<View style={{ width: '100%', marginTop: 24 }}>
						<PrimaryButton
							title='Back to Login'
							onPress={() => router.replace('/auth/login')}
						/>
					</View>
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<Link
				href='/auth/forgot-password'
				asChild>
				<TouchableOpacity style={styles.backButton}>
					<Ionicons
						name='arrow-back'
						size={24}
						color={theme.text}
						style={{ marginRight: 8 }}
					/>
					<Text style={[styles.backText, { color: theme.text }]}>Back</Text>
				</TouchableOpacity>
			</Link>

			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>New Password</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>
					Enter the 6-digit code sent to {email || 'your email'} and choose a new password.
				</Text>
			</View>

			<View style={styles.form}>
				{apiError ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
					</View>
				) : null}

				<AuthInput
					label='Reset Code'
					placeholder='123456'
					keyboardType='number-pad'
					autoCapitalize='none'
					value={code}
					onChangeText={setCode}
					maxLength={6}
				/>
				{errors.code ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.code}</Text> : null}

				<AuthInput
					label='New Password'
					placeholder='••••••••'
					isPassword
					value={newPassword}
					onChangeText={setNewPassword}
				/>
				{errors.newPassword ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.newPassword}</Text> : null}

				<AuthInput
					label='Confirm Password'
					placeholder='••••••••'
					isPassword
					value={confirmPassword}
					onChangeText={setConfirmPassword}
				/>
				{errors.confirmPassword ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.confirmPassword}</Text> : null}

				<PrimaryButton
					title='Reset Password'
					onPress={handleReset}
					isLoading={isLoading}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24, justifyContent: 'center' },
	backButton: {
		position: 'absolute',
		top: 60,
		left: 24,
		zIndex: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	backText: { fontSize: 16, fontWeight: '600' },
	header: { marginBottom: 32, marginTop: 40 },
	title: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
	subtitle: { fontSize: 16 },
	form: { width: '100%' },
	successContent: { alignItems: 'center', paddingHorizontal: 16 },
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
})
