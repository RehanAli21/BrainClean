import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { SocialButton } from '@/components/SocialButton'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { Link, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function LoginScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const { login } = useAuth()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	const handleLogin = () => {
		// Implement JWT Login logic here
		const fakeJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
		login(fakeJwtToken)

		console.log('Logging in with', email, password)
		router.replace('/') // Go to Dashboard on success
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>Sign in to manage your focus guard.</Text>
			</View>

			<View style={styles.form}>
				<AuthInput
					label='Email Address'
					placeholder='user@grayguard.com'
					keyboardType='email-address'
					autoCapitalize='none'
					value={email}
					onChangeText={setEmail}
				/>
				<AuthInput
					label='Password'
					placeholder='••••••••'
					isPassword
					value={password}
					onChangeText={setPassword}
				/>

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
				<Text style={{ color: theme.icon }}>Don't have an account? </Text>
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
})
