import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext' // We will create this next
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function MainScreen() {
	const theme = Colors.dark
	const { logout } = useAuth()

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<Text style={[styles.text, { color: theme.text }]}>Welcome to GrayGuard</Text>
			<Text style={[styles.subText, { color: theme.icon }]}>You are logged in.</Text>

			<View style={{ marginTop: 20, width: '100%' }}>
				<PrimaryButton
					title='Logout'
					onPress={logout}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
	text: { fontSize: 24, fontWeight: 'bold' },
	subText: { marginTop: 8, fontSize: 16 },
})
