import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { authService } from '@/services/api/auth'
import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

const emailSchema = z.object({
	email: z.string().email('Please enter a valid email'),
})

export default function ForgotPasswordScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleSubmit = async () => {
		setErrors({})
		setApiError('')

		const result = emailSchema.safeParse({ email })
		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of result.error.issues) {
				const key = issue.path[0] as string
				if (!fieldErrors[key]) fieldErrors[key] = issue.message
			}
			setErrors(fieldErrors)
			return
		}

		setIsLoading(true)
		try {
			const data = await authService.forgotPassword(email)
			router.push({ pathname: '/auth/reset-password', params: { token: data.resetToken } })
		} catch (err: any) {
			const code = err.response?.data?.error
			if (code === 'USER_NOT_FOUND') {
				setApiError('No account found with this email.')
			} else {
				setApiError('Something went wrong. Please try again.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<Link
				href='/auth/login'
				asChild>
				<TouchableOpacity style={styles.backButton}>
					<Ionicons
						name='arrow-back'
						size={24}
						color={theme.text}
						style={{ marginRight: 8 }}
					/>
					<Text style={[styles.backText, { color: theme.text }]}>Back to Login</Text>
				</TouchableOpacity>
			</Link>

			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>Enter your email to receive a reset token.</Text>
			</View>

			<View style={styles.form}>
				{apiError ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
					</View>
				) : null}

				<AuthInput
					label='Email Address'
					placeholder='user@brainclean.com'
					keyboardType='email-address'
					autoCapitalize='none'
					value={email}
					onChangeText={setEmail}
				/>
				{errors.email ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.email}</Text> : null}

				<PrimaryButton
					title='Send Reset Token'
					onPress={handleSubmit}
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
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
})
