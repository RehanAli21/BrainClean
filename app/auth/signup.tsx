import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/api/auth'
import { Link } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

const signupSchema = z.object({
	email: z.string().email('Please enter a valid email'),
	username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
	password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
})

export default function SignupScreen() {
	const theme = Colors.dark
	const { login } = useAuth()
	const [email, setEmail] = useState('')
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleSignup = async () => {
		setErrors({})
		setApiError('')

		const result = signupSchema.safeParse({ email, username, password })
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
			const data = await authService.signup(email, username, password)
			login(data.token, data.user.email)
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
})
