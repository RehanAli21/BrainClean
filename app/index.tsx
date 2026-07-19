import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

const logo = require('@/assets/images/logo_in_white_color.png')

export default function SplashPage() {
	const theme = Colors.dark
	const router = useRouter()
	const { token, isLoading } = useAuth()

	useEffect(() => {
		SplashScreen.hideAsync()
	}, [])

	// Route based on stored auth state — always sending users to the login
	// screen makes signed-in users see a login flash before being bounced.
	useEffect(() => {
		if (isLoading) return

		const timer = setTimeout(() => {
			router.replace(token ? '/(main)/(tabs)/tasks' : '/auth/login')
		}, 300)

		return () => clearTimeout(timer)
	}, [isLoading, token, router])

	return (
		<View style={[styles.container, { backgroundColor: '#2563EB' }]}>
			<Image
				source={logo}
				style={styles.logo}
				resizeMode='contain'
			/>
			<Text style={[styles.appName, { color: theme.text }]}>BrainClean</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	logo: {
		width: 150,
		height: 150,
	},
	appName: {
		fontSize: 28,
		fontWeight: '700',
		marginTop: 20,
		letterSpacing: 1,
	},
})
