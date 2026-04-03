import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { SocialButton } from '@/components/SocialButton'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/api/auth'
import { Link } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

const loginSchema = z.object({
	email: z.string().email('Please enter a valid email'),
	password: z.string().min(1, 'Password is required'),
})

export default function LoginScreen() {
	const theme = Colors.dark
	const { login } = useAuth()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleLogin = async () => {
		setErrors({})
		setApiError('')

		const result = loginSchema.safeParse({ email, password })
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
			const data = await authService.login(email, password)
			login(data.token, data.user.email)
		} catch (err: any) {
			const code = err.response?.data?.error
			if (code === 'INVALID_CREDENTIALS') {
				setApiError('Invalid email or password.')
			} else if (code === 'ACCOUNT_DEACTIVATED') {
				setApiError('Your account has been deactivated.')
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
				<Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>Sign in to manage your focus guard.</Text>
			</View>

			<View style={styles.form}>
				{apiError ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
					</View>
				) : null}

				<AuthInput
					label='Email Address'
					placeholder='user@grayguard.com'
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

				<View style={styles.forgotContainer}>
					<Link
						href='/auth/forgot-password'
						asChild>
						<TouchableOpacity>
							<Text style={[styles.linkText, { color: theme.primary }]}>Forgot Password?</Text>
						</TouchableOpacity>
					</Link>
				</View>

				<PrimaryButton
					title='Sign In'
					onPress={handleLogin}
					isLoading={isLoading}
				/>

				<View style={styles.divider}>
					<View style={[styles.line, { backgroundColor: theme.border }]} />
					<Text style={[styles.orText, { color: theme.icon }]}>OR</Text>
					<View style={[styles.line, { backgroundColor: theme.border }]} />
				</View>

				<SocialButton
					title='Continue with Google'
					onPress={() => console.log('Google Auth')}
				/>
			</View>

			<View style={styles.footer}>
				<Text style={{ color: theme.icon }}>Don{"'"}t have an account? </Text>
				<Link
					href='/auth/signup'
					asChild>
					<TouchableOpacity>
						<Text style={[styles.linkText, { color: theme.primary }]}>Sign Up</Text>
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
	forgotContainer: { alignItems: 'flex-end', marginBottom: 24, marginTop: -8 },
	linkText: { fontWeight: '600' },
	divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
	line: { flex: 1, height: 1 },
	orText: { marginHorizontal: 16, fontSize: 12, fontWeight: '600' },
	footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
})
