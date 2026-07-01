import { PrimaryButton } from '@/components/PrimaryButton'
import { API_BASE_URL } from '@/constants/config'
import { Colors } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { useCompleteTaskMutation, useDeleteTaskMutation, useStartTaskMutation, useTaskQuery } from '@/hooks/queries/useTasks'
import { useBlocker } from '@/hooks/useBlocker'
import { usePermissions } from '@/hooks/usePermissions'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	if (mins < 60) return `${mins} min`
	const hrs = Math.floor(mins / 60)
	const remainMins = mins % 60
	return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

function formatDate(iso: string): string {
	const date = new Date(iso)
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export default function TaskDetailScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const { taskId, finishFirst } = useLocalSearchParams<{ taskId: string; finishFirst?: string }>()
	const { data: task, isLoading, isError, refetch } = useTaskQuery(taskId!)
	const startMutation = useStartTaskMutation()
	const completeMutation = useCompleteTaskMutation()
	const deleteMutation = useDeleteTaskMutation()
	const { isBlocking, startBlocking, stopBlocking } = useBlocker()
	const { token } = useAuth()
	const { allGranted } = usePermissions()
	const selectedApps = useUiStore(s => s.selectedApps)
	const blockNotifications = useUiStore(s => s.blockNotifications)
	const hasRated = useUiStore(s => s.hasRated)
	const setHasRated = useUiStore(s => s.setHasRated)
	const [apiError, setApiError] = useState('')
	const [now, setNow] = useState(Date.now)

	const isActive = task?.started && !task?.completed
	const eligibleAt = task?.startedAt ? new Date(task.startedAt).getTime() + task.minimumDurationSeconds * 1000 : 0
	const canComplete = isActive && now >= eligibleAt
	const remainingMs = eligibleAt - now

	useFocusEffect(
		useCallback(() => {
			refetch()
		}, [refetch]),
	)

	useEffect(() => {
		if (!isActive || isBlocking || !task || !token || selectedApps.length === 0) return
		try {
			startBlocking(
				selectedApps,
				task.id,
				token,
				API_BASE_URL,
				(task.maximumDurationSeconds ?? 36000) * 1000,
				blockNotifications,
				task.minimumDurationSeconds * 1000,
			)
		} catch {}
	}, [isActive, isBlocking, task, token, selectedApps, blockNotifications, startBlocking])

	useEffect(() => {
		if (!isActive || canComplete) return
		const id = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(id)
	}, [isActive, canComplete])

	const handleComplete = () => {
		setApiError('')
		completeMutation.mutate(taskId!, {
			onSuccess: () => {
				stopBlocking()
			},
			onError: (err: any) => {
				const code = err.response?.data?.error
				if (code === 'TASK_NOT_ELIGIBLE') {
					setApiError('Minimum duration has not elapsed yet.')
				} else if (code === 'TASK_ALREADY_COMPLETED') {
					setApiError('This task has already been completed.')
				} else {
					setApiError('Failed to complete task. Please try again.')
				}
			},
		})
	}

	const handleStart = () => {
		if (!allGranted) {
			setApiError('Required permissions not granted. Go to Settings to grant them.')
			return
		}

		if (selectedApps.length === 0) {
			setApiError('No apps selected for blocking. Select apps in the Apps tab first.')
			return
		}

		setApiError('')
		startMutation.mutate(taskId!, {
			onSuccess: () => {
				try {
					startBlocking(
						selectedApps,
						taskId!,
						token!,
						API_BASE_URL,
						(task!.maximumDurationSeconds ?? 36000) * 1000,
						blockNotifications,
						task!.minimumDurationSeconds * 1000,
					)
				} catch {
					setApiError('Task started but app blocking failed to engage.')
				}
			},
			onError: (err: any) => {
				const code = err.response?.data?.error
				if (code === 'ACTIVE_TASK_EXISTS') {
					const details = err.response?.data?.details
					if (details?.name && details?.startedAt) {
						const startedDate = new Date(details.startedAt).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit',
						})
						setApiError(`"${details.name}" is already active (started ${startedDate}).`)
					} else {
						setApiError('Another task is already active.')
					}
				} else if (code === 'TASK_ALREADY_STARTED') {
					setApiError('This task has already been started.')
				} else if (code === 'TASK_ALREADY_COMPLETED') {
					setApiError('This task has already been completed.')
				} else {
					setApiError('Failed to start task. Please try again.')
				}
			},
		})
	}

	const handleDelete = () => {
		Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					deleteMutation.mutate(taskId!, {
						onSuccess: () => {
							router.replace('/(main)/(tabs)/tasks')
						},
						onError: (err: any) => {
							const code = err.response?.data?.error
							if (code === 'ACTIVE_TASK_EXISTS') {
								const details = err.response?.data?.details
								if (details?.name && details?.startedAt) {
									const startedDate = new Date(details.startedAt).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})
									setApiError(`Cannot delete — "${details.name}" is active (started ${startedDate}).`)
								} else {
									setApiError('Cannot delete an active task.')
								}
							} else {
								setApiError('Failed to delete task. Please try again.')
							}
						},
					})
				},
			},
		])
	}

	if (isLoading) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
				<ActivityIndicator
					size='large'
					color={theme.primary}
				/>
			</View>
		)
	}

	if (isError || !task) {
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
					<Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
					<View style={{ width: 24 }} />
				</View>
				<View style={styles.centered}>
					<Text style={{ color: theme.icon, fontSize: 16 }}>Task not found.</Text>
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
				<Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
				<View style={{ width: 24 }} />
			</View>

			{finishFirst === '1' && isActive ? (
				<View style={[styles.infoBanner, { backgroundColor: theme.primary + '1A' }]}>
					<Ionicons name='information-circle-outline' size={18} color={theme.primary} />
					<Text style={[styles.infoBannerText, { color: theme.primary }]}>
						To create a new task, finish this one first.
					</Text>
				</View>
			) : null}

			{apiError ? (
				<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
					<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
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
					<Text style={[styles.detailText, { color: theme.icon }]}>Duration: {formatDuration(task.minimumDurationSeconds)}</Text>
				</View>

				{task.maximumDurationSeconds && task.maximumDurationSeconds > task.minimumDurationSeconds + 60 ? (
					<View style={styles.row}>
						<Ionicons
							name='hourglass-outline'
							size={18}
							color={theme.icon}
						/>
						<Text style={[styles.detailText, { color: theme.icon }]}>Auto-complete: {formatDuration(task.maximumDurationSeconds)}</Text>
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
								? 'Auto-Completed'
								: 'Completed'
							: task.started
								? 'Active'
								: 'Pending'}
					</Text>
				</View>

				{task.startedAt ? (
					<View style={styles.row}>
						<Ionicons
							name='play-circle-outline'
							size={18}
							color={theme.icon}
						/>
						<Text style={[styles.detailText, { color: theme.icon }]}>Started {formatDate(task.startedAt)}</Text>
					</View>
				) : null}

				{task.completedAt ? (
					<View style={styles.row}>
						<Ionicons
							name='calendar-outline'
							size={18}
							color={theme.icon}
						/>
						<Text style={[styles.detailText, { color: theme.icon }]}>Completed {formatDate(task.completedAt)}</Text>
					</View>
				) : null}

				<View style={[styles.divider, { backgroundColor: theme.border }]} />

				<View style={styles.row}>
					<Ionicons
						name='calendar-outline'
						size={18}
						color={theme.icon}
					/>
					<Text style={[styles.detailText, { color: theme.icon }]}>Created {formatDate(task.createdAt)}</Text>
				</View>
			</View>

			<View style={styles.actions}>
				{isPending ? (
					<PrimaryButton
						title='Start Task'
						onPress={handleStart}
						isLoading={startMutation.isPending}
					/>
				) : null}

				{isActive && canComplete ? (
					<PrimaryButton
						title='Finish Task'
						onPress={handleComplete}
						isLoading={completeMutation.isPending}
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
							Task is active. {formatDuration(Math.ceil(remainingMs / 1000))} remaining.
						</Text>
					</View>
				) : null}

				{isPending ? (
					<TouchableOpacity
						style={[styles.deleteButton, { borderColor: theme.accent }]}
						onPress={handleDelete}
						activeOpacity={0.7}
						disabled={deleteMutation.isPending}>
						{deleteMutation.isPending ? (
							<ActivityIndicator
								size='small'
								color={theme.accent}
							/>
						) : (
							<Text style={[styles.deleteButtonText, { color: theme.accent }]}>Delete Task</Text>
						)}
					</TouchableOpacity>
				) : null}

				{task.completed && !hasRated ? (
					<View style={[styles.rateCard, { backgroundColor: theme.surface, borderColor: theme.primary + '40' }]}>
						<View style={styles.rateCardContent}>
							<Ionicons name='star' size={22} color='#FBBF24' />
							<View style={styles.rateCardText}>
								<Text style={[styles.rateCardTitle, { color: theme.text }]}>Enjoying BrainClean?</Text>
								<Text style={[styles.rateCardHint, { color: theme.icon }]}>Rate us on the Play Store!</Text>
							</View>
						</View>
						<View style={styles.rateCardActions}>
							<TouchableOpacity onPress={() => setHasRated(true)} hitSlop={8}>
								<Text style={[styles.rateCardDismiss, { color: theme.icon }]}>Later</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.rateCardButton, { backgroundColor: theme.primary }]}
								onPress={() => {
									Linking.openURL('https://play.google.com/store/apps/details?id=com.brainclean.app')
									setHasRated(true)
								}}
								activeOpacity={0.8}>
								<Ionicons name='star-outline' size={16} color='#FFFFFF' />
								<Text style={styles.rateCardButtonText}>Rate Now</Text>
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
