import { useTheme } from '@/hooks/useTheme'
import { registerRef, unregisterRef } from '@/components/walkthroughRegistry'
import { useAuth } from '@/context/AuthContext'
import { API_BASE_URL } from '@/constants/config'
import { getSchedules, removeSchedule, toggleSchedule, syncScheduleConfig, type ScheduleInfo } from '@/modules/blocker'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function formatTime(hour: number, minute: number): string {
	const h = hour % 12 || 12
	const suffix = hour < 12 ? 'AM' : 'PM'
	return `${h}:${String(minute).padStart(2, '0')} ${suffix}`
}

function formatDuration(hours: number, minutes: number, t: (key: string, opts?: any) => string): string {
	if (hours > 0 && minutes > 0) return t('common.hoursMinutes', { hours, minutes })
	if (hours > 0) return t('common.hours', { count: hours })
	return t('common.minutes', { count: minutes })
}

function ScheduleCard({
	schedule,
	onToggle,
	onEdit,
	onDelete,
}: {
	schedule: ScheduleInfo
	onToggle: (enabled: boolean) => void
	onEdit: () => void
	onDelete: () => void
}) {
	const theme = useTheme()
	const { t } = useTranslation()

	return (
		<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: schedule.enabled ? 1 : 0.5 }]}>
			<View style={styles.cardTop}>
				<View style={styles.cardLeft}>
					<Text style={[styles.cardTime, { color: theme.text }]}>
						{formatTime(schedule.hour, schedule.minute)}
					</Text>
					<Text style={[styles.cardDuration, { color: theme.icon }]}>
						{formatDuration(schedule.durationHours, schedule.durationMinutes, t)}
						{schedule.label ? ` · ${schedule.label}` : ''}
					</Text>
				</View>
				<View style={styles.cardRight}>
					<Switch
						value={schedule.enabled}
						onValueChange={onToggle}
						trackColor={{ false: theme.border, true: theme.primary }}
						thumbColor={theme.text}
					/>
				</View>
			</View>

			<View style={styles.daysRow}>
				{DAY_LETTERS.map((letter, i) => {
					const active = schedule.repeatDays.includes(i)
					return (
						<View
							key={i}
							style={[
								styles.dayBadge,
								{
									backgroundColor: active ? theme.primary : 'transparent',
									borderColor: active ? theme.primary : theme.border,
								},
							]}>
							<Text style={[styles.dayText, { color: active ? '#FFFFFF' : theme.icon }]}>
								{letter}
							</Text>
						</View>
					)
				})}
			</View>

			{schedule.repeatDays.length === 0 && (
				<Text style={[styles.oneTimeLabel, { color: theme.icon }]}>{t('schedules.oneTime')}</Text>
			)}

			<View style={[styles.footerRow, { borderTopColor: theme.border }]}>
				<TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7} hitSlop={8}>
					<Ionicons name='create-outline' size={18} color={theme.primary} />
					<Text style={[styles.actionText, { color: theme.primary }]}>{t('schedules.edit')}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.actionBtn} onPress={onDelete} activeOpacity={0.7} hitSlop={8}>
					<Ionicons name='trash-outline' size={18} color={theme.accent} />
					<Text style={[styles.actionText, { color: theme.accent }]}>{t('common.delete')}</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

function LoginRequiredView() {
	const theme = useTheme()
	const { t } = useTranslation()
	const router = useRouter()
	const cooldown = useRef(false)

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>{t('schedules.title')}</Text>
			</View>
			<View style={styles.centered}>
				<Ionicons name='lock-closed-outline' size={56} color={theme.border} />
				<Text style={[styles.loginTitle, { color: theme.text }]}>{t('loginRequired.title')}</Text>
				<Text style={[styles.loginSubtitle, { color: theme.icon }]}>{t('loginRequired.schedulesMessage')}</Text>
				<TouchableOpacity
					style={[styles.loginButton, { backgroundColor: theme.primary }]}
					onPress={() => {
						if (cooldown.current) return
						cooldown.current = true
						router.push('/auth/login')
						setTimeout(() => { cooldown.current = false }, 1000)
					}}
					activeOpacity={0.8}>
					<Ionicons name='log-in-outline' size={20} color='#FFFFFF' />
					<Text style={styles.loginButtonText}>{t('loginRequired.loginButton')}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => {
						if (cooldown.current) return
						cooldown.current = true
						router.push('/auth/signup')
						setTimeout(() => { cooldown.current = false }, 1000)
					}}
					activeOpacity={0.7}>
					<Text style={[styles.signupLink, { color: theme.primary }]}>{t('loginRequired.signupLink')}</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

export default function ScheduleListScreen() {
	const { token } = useAuth()

	if (!token) return <LoginRequiredView />

	return <ScheduleListContent />
}

function ScheduleListContent() {
	const theme = useTheme()
	const { t } = useTranslation()
	const router = useRouter()
	const { token } = useAuth()
	const selectedApps = useUiStore(s => s.selectedApps)
	const isPremium = useUiStore(s => s.isPremium)
	const [schedules, setSchedules] = useState<ScheduleInfo[]>([])
	const fabCooldown = useRef(false)
	const fabRef = useRef<View>(null)

	useEffect(() => {
		registerRef('schedules-fab', fabRef)
		return () => unregisterRef('schedules-fab')
	}, [])

	const loadSchedules = useCallback(() => {
		try {
			if (token) {
				syncScheduleConfig(token, API_BASE_URL, selectedApps)
			}
			setSchedules(getSchedules())
		} catch {}
	}, [token, selectedApps])

	useFocusEffect(
		useCallback(() => {
			loadSchedules()
		}, [loadSchedules]),
	)

	const handleToggle = (id: string, enabled: boolean) => {
		try {
			toggleSchedule(id, enabled)
			loadSchedules()
		} catch {}
	}

	const handleEdit = (id: string) => {
		router.push({ pathname: '/(main)/(tabs)/schedules/new', params: { id } })
	}

	const handleDelete = (id: string) => {
		Alert.alert(t('schedules.deleteTitle'), t('schedules.deleteConfirm'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
				style: 'destructive',
				onPress: () => {
					try {
						removeSchedule(id)
						loadSchedules()
					} catch {}
				},
			},
		])
	}

	const renderItem = ({ item }: { item: ScheduleInfo }) => (
		<ScheduleCard
			schedule={item}
			onToggle={enabled => handleToggle(item.id, enabled)}
			onEdit={() => handleEdit(item.id)}
			onDelete={() => handleDelete(item.id)}
		/>
	)

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>{t('schedules.title')}</Text>
			</View>

			{schedules.length === 0 ? (
				<View style={styles.centered}>
					<Ionicons name='alarm-outline' size={48} color={theme.border} />
					<Text style={[styles.emptyText, { color: theme.icon, marginTop: 12 }]}>
						{t('schedules.noSchedules')}
					</Text>
				</View>
			) : (
				<FlatList
					data={schedules}
					keyExtractor={item => item.id}
					renderItem={renderItem}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
				/>
			)}

			<TouchableOpacity
				ref={fabRef}
				style={[styles.fab, { backgroundColor: theme.primary }]}
				onPress={() => {
					if (fabCooldown.current) return
					fabCooldown.current = true
					router.push(isPremium ? '/(main)/(tabs)/schedules/new' : '/(main)/paywall')
					setTimeout(() => {
						fabCooldown.current = false
					}, 1000)
				}}
				activeOpacity={0.8}>
				<Ionicons name='add' size={28} color='#FFFFFF' />
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24, paddingBottom: 0 },
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
		paddingTop: 16,
	},
	title: { fontSize: 32, fontWeight: '700' },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
	list: { paddingBottom: 80 },
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
	},
	cardTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	cardLeft: { flex: 1, marginRight: 12 },
	cardRight: { alignItems: 'flex-end' },
	cardTime: { fontSize: 28, fontWeight: '700', letterSpacing: 1 },
	cardDuration: { fontSize: 13, marginTop: 2 },
	daysRow: {
		flexDirection: 'row',
		gap: 8,
	},
	dayBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dayText: { fontSize: 13, fontWeight: '600' },
	oneTimeLabel: { fontSize: 12, marginTop: 4 },
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		gap: 20,
		marginTop: 14,
		paddingTop: 12,
		borderTopWidth: 1,
	},
	actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	actionText: { fontSize: 13, fontWeight: '600' },
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#2563EB',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6,
	},
	loginTitle: {
		fontSize: 22,
		fontWeight: '700',
		marginTop: 20,
		marginBottom: 8,
	},
	loginSubtitle: {
		fontSize: 15,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 28,
		paddingHorizontal: 20,
	},
	loginButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 52,
		borderRadius: 12,
		paddingHorizontal: 32,
		marginBottom: 16,
	},
	loginButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	signupLink: {
		fontSize: 14,
		fontWeight: '600',
	},
})
