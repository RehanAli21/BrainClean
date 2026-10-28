import { PrimaryButton } from '@/components/PrimaryButton'
import { useTheme } from '@/hooks/useTheme'
import { useBlocker } from '@/hooks/useBlocker'
import { usePermissions } from '@/hooks/usePermissions'
import { reconcileTasks, useTasksHydrated } from '@/hooks/useTasks'
import { isBlocking as nativeIsBlocking } from '@/modules/blocker'
import { isTaskActive, maxBlockTimeMs, useTaskStore } from '@/store/taskStore'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

function useFormatDuration() {
	const { t } = useTranslation()
	return (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		if (mins < 60) return t('common.minutes', { count: mins })
		const hrs = Math.floor(mins / 60)
		const remainMins = mins % 60
		return remainMins > 0 ? t('common.hoursMinutes', { hours: hrs, minutes: remainMins }) : t('common.hours', { count: hrs })
	}
}

function formatDate(iso: string): string {
	const date = new Date(iso)
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export default function TaskDetailScreen() {
	const theme = useTheme()
	const { t } = useTranslation()
	const formatDuration = useFormatDuration()
	const router = useRouter()
	const { taskId, finishFirst } = useLocalSearchParams<{ taskId: string; finishFirst?: string }>()
	const hydrated = useTasksHydrated()
	const task = useTaskStore(s => s.tasks.find(item => item.id === taskId))
	const markStarted = useTaskStore(s => s.markStarted)
	const markCompleted = useTaskStore(s => s.markCompleted)
	const deleteTask = useTaskStore(s => s.deleteTask)
	const { startBlocking, stopBlocking } = useBlocker()
	const { allGranted } = usePermissions()
	const selectedApps = useUiStore(s => s.selectedApps)
	const hasRated = useUiStore(s => s.hasRated)
	const setHasRated = useUiStore(s => s.setHasRated)
	const [actionError, setActionError] = useState('')
	const [now, setNow] = useState(Date.now)
	const deleteCooldown = useRef(false)

	const isActive = task ? isTaskActive(task) : false
	const eligibleAt = task?.startedAt ? new Date(task.startedAt).getTime() + task.minimumDurationSeconds * 1000 : 0
	const canComplete = isActive && now >= eligibleAt
	const remainingMs = eligibleAt - now

	// Pick up a session that ended (max time reached) while this screen was away.
	useFocusEffect(
		useCallback(() => {
			if (hydrated) reconcileTasks()
		}, [hydrated]),
	)

	useEffect(() => {
		if (!isActive || canComplete) return
		const id = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(id)
	}, [isActive, canComplete])

	const handleComplete = () => {
		if (!task) return
		setActionError('')
		// Kotlin refuses to stop before the minimum duration (monotonic clock),
		// so a changed device clock can't end the session early.
		if (!stopBlocking()) {
			setActionError(t('taskDetail.notEligible'))
			return
		}
		markCompleted(task.id)
	}

	const handleStart = () => {
		if (!task) return
		if (!allGranted) {
			setActionError(t('taskDetail.permsNotGranted'))
			return
		}

		if (selectedApps.length === 0) {
			setActionError(t('taskDetail.noApps'))
			return
		}

		const otherActive = useTaskStore.getState().tasks.find(item => item.id !== task.id && isTaskActive(item))
		if (otherActive?.startedAt) {
			setActionError(t('taskDetail.activeNamed', { name: otherActive.name, date: formatDate(otherActive.startedAt) }))
			return
		}
		if (nativeIsBlocking()) {
			setActionError(t('taskDetail.anotherActive'))
			return
		}

		setActionError('')
		try {
			startBlocking(
				selectedApps,
				task.id,
				maxBlockTimeMs(task),
				task.notificationBlockMode,
				task.minimumDurationSeconds * 1000,
				task.customMessage,
			)
		} catch {
			setActionError(t('taskDetail.blockingFailed'))
			return
		}
		markStarted(task.id)
	}

	const handleDelete = () => {
		if (deleteCooldown.current) return
		deleteCooldown.current = true
		setTimeout(() => { deleteCooldown.current = false }, 1000)
		Alert.alert(t('taskDetail.deleteTask'), t('taskDetail.deleteConfirm'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.delete'),
				style: 'destructive',
				onPress: () => {
					deleteTask(taskId!)
					router.replace('/(main)/(tabs)/tasks')
				},
			},
		])
	}

	if (!hydrated) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
				<ActivityIndicator
					size='large'
					color={theme.primary}
				/>
			</View>
		)
	}

	if (!task) {
		return (
			<View style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={styles.header}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={styles.backButton}>
						<Ionicons
							name='arrow-back'
							size={24}
							color={theme.text}
						/>
					</TouchableOpacity>
					<Text style={[styles.headerTitle, { color: theme.text }]}>{t('taskDetail.title')}</Text>
					<View style={{ width: 24 }} />
				</View>
				<View style={styles.centered}>
					<Text style={{ color: theme.icon, fontSize: 16 }}>{t('taskDetail.notFound')}</Text>
				</View>
			</View>
		)
	}

	const isPending = !task.started && !task.completed

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}>
					<Ionicons
						name='arrow-back'
						size={24}
						color={theme.text}
					/>
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: theme.text }]}>{t('taskDetail.title')}</Text>
				<View style={{ width: 24 }} />
			</View>

			{finishFirst === '1' && isActive ? (
				<View style={[styles.infoBanner, { backgroundColor: theme.primary + '1A' }]}>
					<Ionicons name='information-circle-outline' size={18} color={theme.primary} />
					<Text style={[styles.infoBannerText, { color: theme.primary }]}>
						{t('taskDetail.finishFirst')}
					</Text>
				</View>
			) : null}

			{actionError ? (
				<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
					<Text style={[styles.errorBannerText, { color: theme.accent }]}>{actionError}</Text>
				</View>
			) : null}

			<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
				<Text style={[styles.taskName, { color: theme.text }]}>{task.name}</Text>

				<View style={styles.row}>
					<Ionicons
						name='time-outline'
						size={18}
						color={theme.icon}
					/>
					<Text style={[styles.detailText, { color: theme.icon }]}>{t('taskDetail.duration', { duration: formatDuration(task.minimumDurationSeconds) })}</Text>
				</View>

				{task.maximumDurationSeconds && task.maximumDurationSeconds > task.minimumDurationSeconds + 60 ? (
					<View style={styles.row}>
						<Ionicons
							name='hourglass-outline'
							size={18}
							color={theme.icon}
						/>
						<Text style={[styles.detailText, { color: theme.icon }]}>{t('taskDetail.autoComplete', { duration: formatDuration(task.maximumDurationSeconds) })}</Text>
					</View>
				) : null}

				<View style={styles.row}>
					<Ionicons
						name={task.completed ? 'checkmark-circle' : task.started ? 'radio-button-on' : 'ellipse-outline'}
						size={18}
						color={task.completed ? '#10B981' : task.started ? theme.primary : theme.icon}
					/>
					<Text style={[styles.detailText, { color: task.completed ? '#10B981' : task.started ? theme.primary : theme.icon }]}>
						{task.completed
							? task.autoCompleted
								? t('taskDetail.autoCompleted')
								: t('tasks.completed')
							: task.started
								? t('tasks.active')
								: t('tasks.pending')}
					</Text>
				</View>

				{task.startedAt ? (
					<View style={styles.row}>
						<Ionicons
							name='play-circle-outline'
							size={18}
							color={theme.icon}
						/>
						<Text style={[styles.detailText, { color: theme.icon }]}>{t('taskDetail.started', { date: formatDate(task.startedAt) })}</Text>
					</View>
				) : null}

				{task.completedAt ? (
					<View style={styles.row}>
						<Ionicons
							name='calendar-outline'
							size={18}
							color={theme.icon}
						/>
						<Text style={[styles.detailText, { color: theme.icon }]}>{t('taskDetail.completedAt', { date: formatDate(task.completedAt) })}</Text>
					</View>
				) : null}

				<View style={[styles.divider, { backgroundColor: theme.border }]} />

				<View style={styles.row}>
					<Ionicons
						name='calendar-outline'
						size={18}
						color={theme.icon}
					/>
					<Text style={[styles.detailText, { color: theme.icon }]}>{t('taskDetail.created', { date: formatDate(task.createdAt) })}</Text>
				</View>
			</View>

			<View style={styles.actions}>
				{isPending ? (
					<PrimaryButton
						title={t('taskDetail.startTask')}
						onPress={handleStart}
					/>
				) : null}

				{isActive && canComplete ? (
					<PrimaryButton
						title={t('taskDetail.finishTask')}
						onPress={handleComplete}
					/>
				) : null}

				{isActive && !canComplete ? (
					<View style={[styles.infoBanner, { backgroundColor: theme.primary + '1A' }]}>
						<Ionicons
							name='lock-closed-outline'
							size={16}
							color={theme.primary}
						/>
						<Text style={[styles.infoBannerText, { color: theme.primary }]}>
							{t('taskDetail.remaining', { duration: formatDuration(Math.ceil(remainingMs / 1000)) })}
						</Text>
					</View>
				) : null}

				{isPending ? (
					<TouchableOpacity
						style={[styles.deleteButton, { borderColor: theme.accent }]}
						onPress={handleDelete}
						activeOpacity={0.7}>
						<Text style={[styles.deleteButtonText, { color: theme.accent }]}>{t('taskDetail.deleteTask')}</Text>
					</TouchableOpacity>
				) : null}

				{task.completed && !hasRated ? (
					<View style={[styles.rateCard, { backgroundColor: theme.surface, borderColor: theme.primary + '40' }]}>
						<View style={styles.rateCardContent}>
							<Ionicons name='star' size={22} color='#FBBF24' />
							<View style={styles.rateCardText}>
								<Text style={[styles.rateCardTitle, { color: theme.text }]}>{t('taskDetail.enjoyingApp')}</Text>
								<Text style={[styles.rateCardHint, { color: theme.icon }]}>{t('taskDetail.rateHint')}</Text>
							</View>
						</View>
						<View style={styles.rateCardActions}>
							<TouchableOpacity onPress={() => setHasRated(true)} hitSlop={8}>
								<Text style={[styles.rateCardDismiss, { color: theme.icon }]}>{t('taskDetail.later')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.rateCardButton, { backgroundColor: theme.primary }]}
								onPress={() => {
									Linking.openURL('https://play.google.com/store/apps/details?id=com.brainclean.app')
									setHasRated(true)
								}}
								activeOpacity={0.8}>
								<Ionicons name='star-outline' size={16} color='#FFFFFF' />
								<Text style={styles.rateCardButtonText}>{t('taskDetail.rateNow')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24 },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 24,
		paddingTop: 16,
	},
	backButton: { padding: 4 },
	headerTitle: { fontSize: 20, fontWeight: '700' },
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 20,
	},
	taskName: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
	row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
	detailText: { fontSize: 15, marginLeft: 10 },
	divider: { height: 1, marginVertical: 12 },
	actions: { marginTop: 24, gap: 12 },
	infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, gap: 8 },
	infoBannerText: { fontSize: 14, fontWeight: '500', flex: 1 },
	infoBannerLink: { fontWeight: '700', textDecorationLine: 'underline' },
	deleteButton: {
		borderWidth: 1,
		borderRadius: 12,
		height: 52,
		justifyContent: 'center',
		alignItems: 'center',
	},
	deleteButtonText: { fontSize: 16, fontWeight: '600' },
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	rateCard: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 14,
		marginTop: 16,
	},
	rateCardContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 12,
	},
	rateCardText: { flex: 1 },
	rateCardTitle: { fontSize: 15, fontWeight: '600' },
	rateCardHint: { fontSize: 13, marginTop: 2 },
	rateCardActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		gap: 16,
	},
	rateCardDismiss: { fontSize: 14, fontWeight: '500' },
	rateCardButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	rateCardButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})
