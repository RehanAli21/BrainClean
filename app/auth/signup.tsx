import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/api/auth'
import { Link } from 'expo-router'
import React, { useState } from 'react'
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

const signupSchema = z
	.object({
		email: z.string().email('Please enter a valid email'),
		username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
		password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
		confirmPassword: z.string().min(1, 'Please confirm your password'),
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

export default function SignupScreen() {
	const theme = Colors.dark
	const { login } = useAuth()
	const [email, setEmail] = useState('')
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [acceptedTerms, setAcceptedTerms] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleSignup = async () => {
		setErrors({})
		setApiError('')

		const result = signupSchema.safeParse({ email, username, password, confirmPassword })
		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of result.error.issues) {
				const key = issue.path[0] as string
				if (!fieldErrors[key]) fieldErrors[key] = issue.message
			}
			setErrors(fieldErrors)
			return
		}

		if (!acceptedTerms) {
			setErrors({ terms: 'You must accept the Privacy Policy and Terms & Conditions to continue.' })
			return
		}

		setIsLoading(true)
		try {
			const data = await authService.signup(email, username, password)
			login(data.token, data.user.email, data.expiresAt)
		} catch (err: any) {
			const code = err.response?.data?.error
			if (code === 'EMAIL_ALREADY_EXISTS') {
				setApiError('An account with this email already exists.')
			} else if (code === 'USERNAME_ALREADY_EXISTS') {
				setApiError('This username is already taken.')
			} else {
				setApiError('Something went wrong. Please try again.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>Start your digital wellness journey.</Text>
			</View>

			<View style={styles.form}>
				{apiError ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
					</View>
				) : null}

				<AuthInput
					label='Username'
					placeholder='johndoe'
					autoCapitalize='none'
					value={username}
					onChangeText={setUsername}
				/>
				{errors.username ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.username}</Text> : null}

				<AuthInput
					label='Email Address'
					placeholder='user@brainclean.com'
					keyboardType='email-address'
					autoCapitalize='none'
					value={email}
					onChangeText={setEmail}
				/>
				{errors.email ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.email}</Text> : null}

				<AuthInput
					label='Password'
					placeholder='••••••••'
					isPassword
					value={password}
					onChangeText={setPassword}
				/>
				{errors.password ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.password}</Text> : null}

				<AuthInput
					label='Confirm Password'
					placeholder='••••••••'
					isPassword
					value={confirmPassword}
					onChangeText={setConfirmPassword}
				/>
				{errors.confirmPassword ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.confirmPassword}</Text> : null}

				<TouchableOpacity
					style={styles.termsRow}
					activeOpacity={0.7}
					onPress={() => setAcceptedTerms(prev => !prev)}>
					<View
						style={[
							styles.checkbox,
							{ borderColor: acceptedTerms ? theme.primary : theme.border, backgroundColor: acceptedTerms ? theme.primary : 'transparent' },
						]}>
						{acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
					</View>
					<Text style={[styles.termsText, { color: theme.icon }]}>
						I agree to the{' '}
						<Text
							style={[styles.termsLink, { color: theme.primary }]}
							onPress={() => Linking.openURL('https://brainclean.app/legal/privacy')}>
							Privacy Policy
						</Text>
						{' '}and{' '}
						<Text
							style={[styles.termsLink, { color: theme.primary }]}
							onPress={() => Linking.openURL('https://brainclean.app/legal/terms')}>
							Terms & Conditions
						</Text>
						.
					</Text>
				</TouchableOpacity>
				{errors.terms ? <Text style={[styles.fieldError, { color: theme.accent, marginTop: 0 }]}>{errors.terms}</Text> : null}

				<PrimaryButton
					title='Create Account'
					onPress={handleSignup}
					isLoading={isLoading}
				/>
			</View>

			<View style={styles.footer}>
				<Text style={{ color: theme.icon }}>Already have an account? </Text>
				<Link
					href='/auth/login'
					asChild>
					<TouchableOpacity>
						<Text style={[styles.linkText, { color: theme.primary }]}>Sign In</Text>
					</TouchableOpacity>
				</Link>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24, justifyContent: 'center' },
	header: { marginBottom: 32 },
	title: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
	subtitle: { fontSize: 16 },
	form: { width: '100%' },
	linkText: { fontWeight: '600' },
	footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
	termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, marginTop: 4 },
	checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginRight: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
	checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 16 },
	termsText: { flex: 1, fontSize: 13, lineHeight: 19 },
	termsLink: { fontWeight: '600', textDecorationLine: 'underline' },
})
