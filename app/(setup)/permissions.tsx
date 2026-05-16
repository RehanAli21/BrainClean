import { Colors } from '@/constants/theme'
import { usePermissions } from '@/hooks/usePermissions'
import { requestOverlayPermission, requestUsageStatsPermission } from '@/modules/blocker'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function PermissionsScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const { permissions, isLoading, allGranted } = usePermissions()

	// Navigate to main app once all permissions are granted
	useEffect(() => {
		if (allGranted) {
			router.replace('/(main)/(tabs)/tasks')
		}
	}, [allGranted, router])

	// Close app on hardware back press if permissions not granted
	useEffect(() => {
		const handler = BackHandler.addEventListener('hardwareBackPress', () => {
			if (!allGranted) {
				BackHandler.exitApp()
				return true
			}
			return false
		})
		return () => handler.remove()
	}, [allGranted])

	if (isLoading || !permissions) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
				<ActivityIndicator
					size='large'
					color={theme.primary}
				/>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Ionicons
					name='shield-checkmark-outline'
					size={48}
					color={theme.primary}
				/>
				<Text style={[styles.title, { color: theme.text }]}>Permissions Required</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>BrainClean needs these permissions to block apps and protect your focus.</Text>
			</View>

			<View style={styles.cards}>
				<PermissionCard
					title='Usage Access'
					description='Required to detect which app is in the foreground so BrainClean can block it.'
					granted={permissions.usageStats}
					onRequest={requestUsageStatsPermission}
				/>

				<PermissionCard
					title='Display Over Other Apps'
					description='Required to show the blocking overlay when you open a blocked app.'
					granted={permissions.overlay}
					onRequest={requestOverlayPermission}
				/>
			</View>

			<Text style={[styles.footerText, { color: theme.icon }]}>
				Each permission opens Android Settings. Toggle the permission for BrainClean, then return here.
			</Text>
		</View>
	)
}

function PermissionCard({ title, description, granted, onRequest }: { title: string; description: string; granted: boolean; onRequest: () => void }) {
	const theme = Colors.dark

	return (
		<View style={[styles.card, { backgroundColor: theme.surface, borderColor: granted ? theme.success : theme.border }]}>
			<View style={styles.cardHeader}>
				<Ionicons
					name={granted ? 'checkmark-circle' : 'alert-circle-outline'}
					size={24}
					color={granted ? theme.success : theme.accent}
				/>
				<Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
			</View>
			<Text style={[styles.cardDescription, { color: theme.icon }]}>{description}</Text>
			{!granted ? (
				<TouchableOpacity
					style={[styles.grantButton, { backgroundColor: theme.primary }]}
					onPress={onRequest}
					activeOpacity={0.7}>
					<Text style={styles.grantButtonText}>Grant Permission</Text>
				</TouchableOpacity>
			) : (
				<View style={[styles.grantedBadge, { backgroundColor: theme.success + '1A' }]}>
					<Text style={[styles.grantedText, { color: theme.success }]}>Granted</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24, justifyContent: 'center' },
	centered: { justifyContent: 'center', alignItems: 'center' },
	header: { alignItems: 'center', marginBottom: 32 },
	title: { fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 8 },
	subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
	cards: { gap: 16 },
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
	},
	cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
	cardTitle: { fontSize: 17, fontWeight: '600' },
	cardDescription: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
	grantButton: {
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	grantButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
	grantedBadge: {
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	grantedText: { fontSize: 15, fontWeight: '600' },
	footerText: { fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 18 },
})
