import { PadlockProtectionCard } from '@/components/PadlockProtectionCard'
import { Colors } from '@/constants/theme'
import { useOemAutoStart } from '@/hooks/useOemAutoStart'
import { usePermissions } from '@/hooks/usePermissions'
import {
	requestBatteryOptimizationExemption,
	requestOverlayPermission,
	requestUsageStatsPermission,
} from '@/modules/blocker'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function PermissionsScreen() {
	const theme = Colors.dark
	const { t } = useTranslation()
	const router = useRouter()
	const { permissions, isLoading, allGranted } = usePermissions()
	const { manufacturer, requiresAutoStart } = useOemAutoStart()

	useEffect(() => {
		if (allGranted) {
			router.replace('/(main)/(tabs)/tasks')
		}
	}, [allGranted, router])

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
		<ScrollView
			style={[styles.container, { backgroundColor: theme.background }]}
			contentContainerStyle={styles.scrollContent}>
			<View style={styles.header}>
				<Ionicons
					name='shield-checkmark-outline'
					size={48}
					color={theme.primary}
				/>
				<Text style={[styles.title, { color: theme.text }]}>{t('permissions.title')}</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>{t('permissions.subtitle')}</Text>
			</View>

			<View style={styles.cards}>
				<PermissionCard
					title={t('permissions.usageAccess')}
					description={t('permissions.usageAccessDesc')}
					granted={permissions.usageStats}
					onRequest={requestUsageStatsPermission}
				/>

				<PermissionCard
					title={t('permissions.overlay')}
					description={t('permissions.overlayDesc')}
					granted={permissions.overlay}
					onRequest={requestOverlayPermission}
				/>

				<PermissionCard
					title={t('permissions.battery')}
					description={t('permissions.batteryDesc')}
					granted={permissions.batteryOptimization}
					onRequest={requestBatteryOptimizationExemption}
				/>

				{requiresAutoStart ? (
					<PadlockProtectionCard manufacturer={manufacturer} />
				) : null}
			</View>

			<Text style={[styles.footerText, { color: theme.icon }]}>
				{t('permissions.footer')}
			</Text>
		</ScrollView>
	)
}

function PermissionCard({ title, description, granted, onRequest }: { title: string; description: string; granted: boolean; onRequest: () => void }) {
	const theme = Colors.dark
	const { t } = useTranslation()
	const cooldown = useRef(false)

	const handlePress = () => {
		if (cooldown.current) return
		cooldown.current = true
		onRequest()
		setTimeout(() => { cooldown.current = false }, 1000)
	}

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
					onPress={handlePress}
					activeOpacity={0.7}>
					<Text style={styles.grantButtonText}>{t('permissions.grantPermission')}</Text>
				</TouchableOpacity>
			) : (
				<View style={[styles.grantedBadge, { backgroundColor: theme.success + '1A' }]}>
					<Text style={[styles.grantedText, { color: theme.success }]}>{t('common.granted')}</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	scrollContent: { padding: 24, justifyContent: 'center', flexGrow: 1 },
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
