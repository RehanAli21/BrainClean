import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { SocialButton } from '@/components/SocialButton'
import { Colors } from '@/constants/theme'
import { Link, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function SignupScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>Start your digital wellness journey.</Text>
			</View>

			<View style={styles.form}>
				<AuthInput
					label='Full Name'
					placeholder='John Doe'
				/>
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

				<PrimaryButton
					title='Create Account'
					onPress={() => router.replace('/')}
				/>

				<View style={styles.divider}>
					<View style={[styles.line, { backgroundColor: theme.border }]} />
					<Text style={[styles.orText, { color: theme.icon }]}>OR</Text>
					<View style={[styles.line, { backgroundColor: theme.border }]} />
				</View>

				<SocialButton
					title='Sign up with Google'
					onPress={() => console.log('Google Auth')}
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
	divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
	line: { flex: 1, height: 1 },
	orText: { marginHorizontal: 16, fontSize: 12, fontWeight: '600' },
	footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
})
