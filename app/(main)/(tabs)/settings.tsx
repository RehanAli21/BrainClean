import { LanguagePicker } from '@/components/LanguagePicker'
import { PadlockProtectionCard } from '@/components/PadlockProtectionCard'
import { TutorialOverlay } from '@/components/TutorialOverlay'
import { registerRef, unregisterRef } from '@/components/walkthroughRegistry'
import { useTheme } from '@/hooks/useTheme'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { useAuth } from '@/context/AuthContext'
import { useBlocker } from '@/hooks/useBlocker'
import { useRouter } from 'expo-router'
import { useOemAutoStart } from '@/hooks/useOemAutoStart'
import { usePermissions } from '@/hooks/usePermissions'
import {
	requestBatteryOptimizationExemption,
	requestOverlayPermission,
	requestUsageStatsPermission,
} from '@/modules/blocker'
import { userService } from '@/services/api/users'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'

export default function SettingsScreen() {
	const theme = useTheme()
	const { t, i18n } = useTranslation()
	const router = useRouter()
	const { token, email, logout } = useAuth()
	const isLoggedIn = !!token
	const { permissions, recheck } = usePermissions()
	const { manufacturer, requiresAutoStart } = useOemAutoStart()
	const { isBlocking } = useBlocker()
	const themeMode = useUiStore(s => s.themeMode)
	const setThemeMode = useUiStore(s => s.setThemeMode)
	const subscriptionState = useUiStore(s => s.subscriptionState)
	const subscriptionExpiresAt = useUiStore(s => s.subscriptionExpiresAt)
	const [deleting, setDeleting] = useState(false)
	const [showTutorial, setShowTutorial] = useState(false)
	const [showLanguagePicker, setShowLanguagePicker] = useState(false)
	const permsRef = useRef<View | null>(null)

	useEffect(() => {
		registerRef('settings-permissions', permsRef)
		return () => { unregisterRef('settings-permissions') }
	}, [])

	const handleLogout = () => {
		Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{ text: t('settings.logout'), style: 'destructive', onPress: logout },
		])
	}

	const handleDeleteAccount = () => {
		Alert.alert(
			t('settings.deleteAccount'),
			t('settings.deleteConfirm'),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: async () => {
						setDeleting(true)
						try {
							await userService.deleteAccount()
							await logout()
						} catch (err: any) {
							setDeleting(false)
							const msg = err.response?.data?.message
							Alert.alert(t('common.error'), msg || (!err.response ? t('common.networkError') : t('settings.deleteFailed')))
						}
					},
				},
			],
		)
	}

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView
				style={[styles.container, { backgroundColor: theme.background }]}
				contentContainerStyle={styles.content}>
				<Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>

				{isLoggedIn && isBlocking ? (
					<View style={[styles.lockBanner, { backgroundColor: theme.primary + '1A', borderColor: theme.primary }]}>
						<Ionicons
							name='lock-closed'
							size={18}
							color={theme.primary}
						/>
						<Text style={[styles.lockBannerText, { color: theme.text }]}>
							{t('settings.locked')}
						</Text>
					</View>
				) : null}

				{isLoggedIn && subscriptionState === 'IN_GRACE_PERIOD' ? (
					<View style={[styles.lockBanner, { backgroundColor: '#F59E0B1A', borderColor: '#F59E0B' }]}>
						<Ionicons name='warning-outline' size={18} color='#F59E0B' />
						<Text style={[styles.lockBannerText, { color: '#F59E0B' }]}>
							{t('subscription.gracePeriod')}
						</Text>
					</View>
				) : null}

				{isLoggedIn && subscriptionState === 'CANCELED' && subscriptionExpiresAt && new Date(subscriptionExpiresAt) > new Date() ? (
					<View style={[styles.lockBanner, { backgroundColor: '#F59E0B1A', borderColor: '#F59E0B' }]}>
						<Ionicons name='time-outline' size={18} color='#F59E0B' />
						<Text style={[styles.lockBannerText, { color: '#F59E0B' }]}>
							{t('subscription.canceled', { date: new Date(subscriptionExpiresAt).toLocaleDateString() })}
						</Text>
					</View>
				) : null}

				{isLoggedIn && subscriptionState === 'PENDING' ? (
					<View style={[styles.lockBanner, { backgroundColor: theme.primary + '1A', borderColor: theme.primary }]}>
						<ActivityIndicator size='small' color={theme.primary} />
						<Text style={[styles.lockBannerText, { color: theme.primary }]}>
							{t('subscription.pending')}
						</Text>
					</View>
				) : null}

				{isLoggedIn ? (
					<>
						<Text style={[styles.sectionTitle, { color: theme.icon }]}>{t('settings.profile')}</Text>
						<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
							<View style={styles.row}>
								<Ionicons
									name='mail-outline'
									size={20}
									color={theme.icon}
								/>
								<View style={styles.rowText}>
									<Text style={[styles.label, { color: theme.icon }]}>{t('settings.email')}</Text>
									<Text style={[styles.value, { color: theme.text }]}>{email ?? t('settings.notAvailable')}</Text>
								</View>
							</View>
						</View>
					</>
				) : null}

				<Text style={[styles.sectionTitle, { color: theme.icon }]}>{t('settings.language')}</Text>
				<TouchableOpacity
					style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
					onPress={() => setShowLanguagePicker(true)}
					activeOpacity={0.7}
					disabled={isBlocking}>
					<View style={styles.row}>
						<Ionicons name='language-outline' size={20} color={theme.icon} />
						<View style={styles.rowText}>
							<Text style={[styles.label, { color: theme.icon }]}>{t('settings.currentLanguage')}</Text>
							<Text style={[styles.value, { color: theme.text }]}>
								{SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.nativeName ?? 'English'}
							</Text>
						</View>
						<Ionicons name='chevron-forward' size={20} color={theme.icon} />
					</View>
				</TouchableOpacity>

				<LanguagePicker visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)} />

				<Text style={[styles.sectionTitle, { color: theme.icon }]}>{t('settings.themeSection')}</Text>
				<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
					<View style={styles.notifHeader}>
						<Ionicons name='color-palette-outline' size={20} color={theme.icon} />
						<View style={styles.rowText}>
							<Text style={[styles.label, { color: theme.icon }]}>{t('settings.themeMode')}</Text>
						</View>
					</View>
					<View style={styles.notifModes}>
						{(['system', 'light', 'dark'] as const).map(mode => {
							const labels = {
								system: t('settings.themeSystem'),
								light: t('settings.themeLight'),
								dark: t('settings.themeDark'),
							}
							const active = themeMode === mode
							return (
								<TouchableOpacity
									key={mode}
									style={[
										styles.notifModeBtn,
										{
											backgroundColor: active ? theme.primary : 'transparent',
											borderColor: active ? theme.primary : theme.border,
										},
									]}
									onPress={() => setThemeMode(mode)}
									activeOpacity={0.7}>
									<Text
										style={[
											styles.notifModeBtnText,
											{ color: active ? '#FFFFFF' : theme.icon },
										]}>
										{labels[mode]}
									</Text>
								</TouchableOpacity>
							)
						})}
					</View>
				</View>

				<Text style={[styles.sectionTitle, { color: theme.icon }]}>{t('settings.permissionsSection')}</Text>
				<View ref={permsRef} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
					<PermissionRow
						icon='stats-chart-outline'
						title={t('settings.usageAccess')}
						description={t('settings.usageAccessDesc')}
						granted={permissions?.usageStats ?? false}
						disabled={isBlocking}
						onRequest={() => {
							requestUsageStatsPermission()
						}}
					/>
					<View style={[styles.permDivider, { backgroundColor: theme.border }]} />
					<PermissionRow
						icon='layers-outline'
						title={t('settings.overlay')}
						description={t('settings.overlayDesc')}
						granted={permissions?.overlay ?? false}
						disabled={isBlocking}
						onRequest={() => {
							requestOverlayPermission()
						}}
					/>
					<View style={[styles.permDivider, { backgroundColor: theme.border }]} />
					<PermissionRow
						icon='battery-charging-outline'
						title={t('settings.battery')}
						description={t('settings.batteryDesc')}
						granted={permissions?.batteryOptimization ?? false}
						disabled={isBlocking}
						onRequest={() => {
							requestBatteryOptimizationExemption()
						}}
					/>
				</View>

				{requiresAutoStart ? (
					<View style={{ marginBottom: 24 }}>
						<PadlockProtectionCard manufacturer={manufacturer} />
					</View>
				) : null}

				<TouchableOpacity
					style={[styles.tutorialButton, { backgroundColor: theme.primary }]}
					onPress={() => setShowTutorial(true)}
					activeOpacity={0.7}>
					<Ionicons name='help-circle-outline' size={20} color='#FFFFFF' />
					<Text style={styles.tutorialButtonText}>{t('settings.showTutorial')}</Text>
				</TouchableOpacity>

				<TutorialOverlay visible={showTutorial} onClose={() => setShowTutorial(false)} />

				{isLoggedIn ? (
					<>
						<TouchableOpacity
							style={[styles.logoutButton, { borderColor: theme.accent }, isBlocking && styles.disabled]}
							onPress={handleLogout}
							activeOpacity={0.7}
							disabled={isBlocking}>
							<Ionicons
								name='log-out-outline'
								size={20}
								color={theme.accent}
							/>
							<Text style={[styles.logoutText, { color: theme.accent }]}>{t('settings.logout')}</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.deleteButton, { backgroundColor: theme.accent }, isBlocking && styles.disabled]}
							onPress={handleDeleteAccount}
							activeOpacity={0.7}
							disabled={deleting || isBlocking}>
							{deleting ? (
								<ActivityIndicator
									size='small'
									color='#FFFFFF'
								/>
							) : (
								<>
									<Ionicons
										name='trash-outline'
										size={20}
										color='#FFFFFF'
									/>
									<Text style={styles.deleteText}>{t('settings.deleteAccount')}</Text>
								</>
							)}
						</TouchableOpacity>
					</>
				) : (
					<TouchableOpacity
						style={[styles.loginButton, { backgroundColor: theme.primary }]}
						onPress={() => router.push('/auth/login')}
						activeOpacity={0.8}>
						<Ionicons name='log-in-outline' size={20} color='#FFFFFF' />
						<Text style={styles.loginButtonText}>{t('loginRequired.loginButton')}</Text>
					</TouchableOpacity>
				)}
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

function PermissionRow({
	icon,
	title,
	description,
	granted,
	disabled = false,
	onRequest,
}: {
	icon: keyof typeof Ionicons.glyphMap
	title: string
	description: string
	granted: boolean
	disabled?: boolean
	onRequest: () => void
}) {
	const theme = useTheme()
	const { t } = useTranslation()
	const cooldown = useRef(false)

	const handlePress = () => {
		if (cooldown.current) return
		cooldown.current = true
		onRequest()
		setTimeout(() => { cooldown.current = false }, 1000)
	}

	return (
		<View style={styles.permRow}>
			<View style={styles.permInfo}>
				<Ionicons
					name={icon}
					size={20}
					color={theme.icon}
				/>
				<View style={{ flex: 1 }}>
					<Text style={[styles.permTitle, { color: theme.text }]}>{title}</Text>
					<Text style={[styles.hint, { color: theme.icon }]}>{description}</Text>
				</View>
			</View>
			{granted ? (
				<View style={[styles.permBadge, { backgroundColor: theme.success + '1A' }]}>
					<Ionicons
						name='checkmark-circle'
						size={14}
						color={theme.success}
					/>
					<Text style={[styles.permBadgeText, { color: theme.success }]}>{t('common.granted')}</Text>
				</View>
			) : (
				<TouchableOpacity
					style={[styles.permButton, { backgroundColor: theme.primary }, disabled && styles.disabled]}
					onPress={handlePress}
					activeOpacity={0.7}
					disabled={disabled}>
					<Text style={styles.permButtonText}>{t('common.grant')}</Text>
				</TouchableOpacity>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 24, paddingTop: 40 },
	title: { fontSize: 32, fontWeight: '700', marginBottom: 24 },
	sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
	},
	row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowText: { flex: 1 },
	label: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
	value: { fontSize: 16, fontWeight: '500' },
	hint: { fontSize: 12, marginTop: 2 },
	toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	toggleInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
	notifHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
	notifModes: { flexDirection: 'row', gap: 8 },
	notifModeBtn: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
	},
	notifModeBtnText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
	tutorialButton: {
		borderRadius: 12,
		height: 52,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		marginBottom: 12,
	},
	tutorialButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
	logoutButton: {
		borderWidth: 1,
		borderRadius: 12,
		height: 52,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		marginTop: 8,
	},
	logoutText: { fontSize: 16, fontWeight: '600' },
	deleteButton: {
		borderRadius: 12,
		height: 52,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		marginTop: 12,
	},
	deleteText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
	permRow: { gap: 8 },
	permInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	permTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
	permDivider: { height: 1, marginVertical: 12 },
	permBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		marginLeft: 32,
	},
	permBadgeText: { fontSize: 12, fontWeight: '600' },
	permButton: {
		alignSelf: 'flex-start',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		marginLeft: 32,
	},
	permButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
	lockBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		marginBottom: 24,
	},
	lockBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
	disabled: { opacity: 0.4 },
	loginButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 52,
		borderRadius: 12,
		marginTop: 8,
	},
	loginButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
})
