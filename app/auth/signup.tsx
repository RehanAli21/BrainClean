import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { SocialButton } from '@/components/SocialButton'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { signInWithGoogle } from '@/modules/google-auth'
import { authService } from '@/services/api/auth'
import { Link, useRouter } from 'expo-router'
import React, { useRef, useState } from 'react'
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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
	const router = useRouter()
	const { login } = useAuth()
	const [email, setEmail] = useState('')
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [acceptedTerms, setAcceptedTerms] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [emailExists, setEmailExists] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [googleLoading, setGoogleLoading] = useState(false)
	const googleCooldown = useRef(false)

	const handleSignup = async () => {
		setErrors({})
		setApiError('')
		setEmailExists(false)

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
				setEmailExists(true)
			} else if (code === 'USERNAME_ALREADY_EXISTS') {
				setApiError('This username is already taken.')
			} else {
				setApiError('Something went wrong. Please try again.')
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleSignIn = async () => {
		if (googleCooldown.current) return
		googleCooldown.current = true
		setApiError('')
		setEmailExists(false)
		setGoogleLoading(true)
		try {
			const idToken = await signInWithGoogle()
			const data = await authService.googleLogin(idToken)
			login(data.token, data.user.email, data.expiresAt)
		} catch (err: any) {
			const nativeCode = err.code
			if (nativeCode === 'SIGN_IN_CANCELLED') {
				// silent dismissal
			} else {
				const code = err.response?.data?.error
				if (code === 'INVALID_ID_TOKEN') {
					setApiError("Couldn't sign in with Google. Please try again.")
				} else if (code === 'ACCOUNT_DEACTIVATED') {
					setApiError('This account has been deactivated. Contact support.')
				} else if (code === 'RATE_LIMIT_EXCEEDED') {
					setApiError('Too many attempts. Please wait a minute and try again.')
				} else {
					setApiError('Something went wrong. Please try again.')
				}
			}
		} finally {
			setGoogleLoading(false)
			setTimeout(() => { googleCooldown.current = false }, 1000)
		}
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>Start your digital wellness journey.</Text>
			</View>

			<View style={styles.form}>
				{emailExists ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>
							Account already exists.{' '}
							<Text style={styles.errorLink} onPress={() => router.replace('/auth/login')}>
								Login
							</Text>
							{' '}or if you want to change password go to{' '}
							<Text style={styles.errorLink} onPress={() => router.replace('/auth/forgot-password')}>
								Forgot Password
							</Text>
							.
						</Text>
					</View>
				) : apiError ? (
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

				{Platform.OS === 'android' ? (
					<>
						<View style={styles.dividerRow}>
							<View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
							<Text style={[styles.dividerText, { color: theme.icon }]}>or</Text>
							<View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
						</View>

						<SocialButton
							title={googleLoading ? 'Signing in...' : 'Sign up with Google'}
							onPress={handleGoogleSignIn}
						/>
					</>
				) : null}
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
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
	errorLink: { fontWeight: '700', textDecorationLine: 'underline' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
	termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, marginTop: 4 },
	checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginRight: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
	checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 16 },
	termsText: { flex: 1, fontSize: 13, lineHeight: 19 },
	termsLink: { fontWeight: '600', textDecorationLine: 'underline' },
	dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
	dividerLine: { flex: 1, height: 1 },
	dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },
})
