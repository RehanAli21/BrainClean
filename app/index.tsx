import { useTheme } from '@/hooks/useTheme'
import { useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

const logo = require('@/assets/images/logo_in_white_color.png')

export default function SplashPage() {
	const theme = useTheme()
	const router = useRouter()

	useEffect(() => {
		SplashScreen.hideAsync()
	}, [])

	useEffect(() => {
		const timer = setTimeout(() => {
			router.replace('/(main)/(tabs)/wellness')
		}, 300)

		return () => clearTimeout(timer)
	}, [router])

	return (
		<View style={[styles.container, { backgroundColor: '#12121a' }]}>
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
