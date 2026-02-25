import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons' // Import the icon family
import { Link, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ForgotPasswordScreen() {
	const theme = Colors.dark // Or use useColorScheme() for dynamic theme
	const router = useRouter()
	const [email, setEmail] = useState('')

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			{/* Back Button with Icon */}
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
				<Text style={[styles.subtitle, { color: theme.icon }]}>Enter your email to receive a recovery link.</Text>
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

				<PrimaryButton
					title='Send Link'
					onPress={() => console.log('Reset sent')}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		justifyContent: 'center',
	},
	backButton: {
		position: 'absolute',
		top: 60,
		left: 24,
		zIndex: 10,
		flexDirection: 'row', // Aligns icon and text horizontally
		alignItems: 'center',
	},
	backText: {
		fontSize: 16,
		fontWeight: '600',
	},
	header: {
		marginBottom: 32,
		marginTop: 40,
	},
	title: {
		fontSize: 32,
		fontWeight: '700',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
	},
	form: {
		width: '100%',
	},
})
