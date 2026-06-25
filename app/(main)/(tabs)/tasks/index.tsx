import { API_BASE_URL, TASK_POLL_INTERVAL_MS } from '@/constants/config'
import { Colors } from '@/constants/theme'
import { TOKEN_EXPIRY_BUFFER_MS, useAuth } from '@/context/AuthContext'
import { useTasksQuery } from '@/hooks/queries/useTasks'
import { useBlocker } from '@/hooks/useBlocker'
import { useUiStore } from '@/store/uiStore'
import type { Task } from '@/types/task'
import Ionicons from '@expo/vector-icons/Ionicons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

function toDateString(d: Date): string {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function getTodayDate(): string {
	return toDateString(new Date())
}

function formatDateLabel(date: string): string {
	const today = getTodayDate()
	if (date === today) return 'Today'
	const [y, m, d] = date.split('-').map(Number)
	const dateObj = new Date(y, m - 1, d)
	return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	if (mins < 60) return `${mins} min`
	const hrs = Math.floor(mins / 60)
	const remainMins = mins % 60
	return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

function getTaskStatus(task: Task) {
	if (task.completed) return { icon: 'checkmark-circle' as const, color: '#10B981', label: 'Completed' }
	if (task.started) return { icon: 'radio-button-on' as const, color: '#2563EB', label: 'Active' }
	return { icon: 'ellipse-outline' as const, color: '#A1A1AA', label: 'Pending' }
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
	const theme = Colors.dark
	const status = getTaskStatus(task)
	return (
		<TouchableOpacity
			style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
			onPress={onPress}
			activeOpacity={0.7}>
			<View style={styles.cardContent}>
				<View style={styles.cardText}>
					<Text
						style={[styles.taskName, { color: theme.text }, task.completed && styles.taskNameCompleted]}
						numberOfLines={1}>
						{task.name}
					</Text>
					<Text style={[styles.taskDuration, { color: theme.icon }]}>
						{formatDuration(task.minimumDurationSeconds)}
						{task.maximumDurationSeconds ? ` · Max ${formatDuration(task.maximumDurationSeconds)}` : ''}
					</Text>
					<Text style={[styles.taskHint, { color: theme.primary, marginTop: 10 }]}>Tap to view details</Text>
				</View>
				<Ionicons
					name={status.icon}
					size={24}
					color={status.color}
				/>
			</View>
		</TouchableOpacity>
	)
}

export default function TaskListScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const [selectedDate, setSelectedDate] = useState(getTodayDate)
	const [showPicker, setShowPicker] = useState(false)
	const { data: tasks, isLoading, isError, refetch } = useTasksQuery(selectedDate)
	const { isBlocking, startBlocking, stopBlocking } = useBlocker()
	const { token, tokenExpiresAt, logout } = useAuth()
	const selectedApps = useUiStore(s => s.selectedApps)
	const maxBlockTimeMinutes = useUiStore(s => s.maxBlockTimeMinutes)
	const blockNotifications = useUiStore(s => s.blockNotifications)
	const hasActiveTask = tasks?.some(t => t.started && !t.completed) ?? false
	const fabCooldown = useRef(false)

	// Proactively log the user out 1 day before their JWT actually expires, so
	// they re-login while their session still works rather than getting a 401
	// mid-task. Runs every time the user lands on the Tasks screen.
	useFocusEffect(
		useCallback(() => {
			if (tokenExpiresAt != null && Date.now() >= tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
				logout()
			}
		}, [tokenExpiresAt, logout]),
	)

	useFocusEffect(
		useCallback(() => {
			refetch()
		}, [refetch]),
	)

	// Stop native blocking when no task is active (task completed from website)
	useEffect(() => {
		if (tasks && !hasActiveTask && isBlocking) {
			stopBlocking()
		}
	}, [tasks, hasActiveTask, isBlocking, stopBlocking])

	// Re-engage blocking if task is active but service isn't running (e.g. after app update)
	const activeTask = tasks?.find(t => t.started && !t.completed)

	useEffect(() => {
		if (!activeTask || isBlocking || !token || selectedApps.length === 0) return
		try {
			startBlocking(
				selectedApps,
				activeTask.id,
				token,
				API_BASE_URL,
				maxBlockTimeMinutes * 60 * 1000,
				blockNotifications,
				activeTask.minimumDurationSeconds * 1000,
			)
		} catch {}
	}, [activeTask, isBlocking, token, selectedApps, maxBlockTimeMinutes, blockNotifications, startBlocking])
	const activeStartedAt = activeTask?.startedAt
	const activeMinDuration = activeTask?.minimumDurationSeconds

	useEffect(() => {
		if (!isBlocking || !activeStartedAt || !activeMinDuration) return

		const eligibleAt = new Date(activeStartedAt).getTime() + activeMinDuration * 1000
		const pollStartAt = eligibleAt - 60_000
		const delayMs = Math.max(0, pollStartAt - Date.now())

		let intervalId: ReturnType<typeof setInterval> | undefined

		const timeoutId = setTimeout(() => {
			refetch()
			intervalId = setInterval(refetch, TASK_POLL_INTERVAL_MS)
		}, delayMs)

		return () => {
			clearTimeout(timeoutId)
			if (intervalId) clearInterval(intervalId)
		}
	}, [isBlocking, activeStartedAt, activeMinDuration, refetch])

	const renderItem = ({ item }: { item: Task }) => (
		<TaskCard
			task={item}
			onPress={() => router.push(`/(main)/(tabs)/tasks/${item.id}`)}
		/>
	)

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>Tasks</Text>
			</View>

			<TouchableOpacity
				style={[styles.datePicker, { backgroundColor: theme.surface, borderColor: theme.border }]}
				onPress={() => setShowPicker(true)}
				activeOpacity={0.7}>
				<Ionicons
					name='calendar-outline'
					size={18}
					color={theme.primary}
				/>
				<Text style={[styles.dateLabel, { color: theme.text }]}>{formatDateLabel(selectedDate)}</Text>
			</TouchableOpacity>

			{showPicker ? (
				<DateTimePicker
					value={(() => {
						const [y, m, d] = selectedDate.split('-').map(Number)
						return new Date(y, m - 1, d)
					})()}
					mode='date'
					display='default'
					onValueChange={(_, date) => {
						setShowPicker(false)
						if (date) setSelectedDate(toDateString(date))
					}}
					onDismiss={() => setShowPicker(false)}
				/>
			) : null}

			{isLoading ? (
				<View style={styles.centered}>
					<ActivityIndicator
						size='large'
						color={theme.primary}
					/>
				</View>
			) : isError ? (
				<View style={styles.centered}>
					<Text style={[styles.emptyText, { color: theme.icon }]}>Failed to load tasks.</Text>
					<TouchableOpacity
						onPress={() => refetch()}
						style={{ marginTop: 12 }}>
						<Text style={{ color: theme.primary, fontWeight: '600' }}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : !tasks || tasks.length === 0 ? (
				<View style={styles.centered}>
					<Ionicons
						name='clipboard-outline'
						size={48}
						color={theme.border}
					/>
					<Text style={[styles.emptyText, { color: theme.icon, marginTop: 12 }]}>No tasks yet.{'\n'}Create your first task!</Text>
				</View>
			) : (
				<FlatList
					data={tasks}
					keyExtractor={item => item.id}
					renderItem={renderItem}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{hasActiveTask ? null : (
				<TouchableOpacity
					style={[styles.fab, { backgroundColor: theme.primary }]}
					onPress={() => {
						if (fabCooldown.current) return
						fabCooldown.current = true
						router.push('/(main)/(tabs)/tasks/new')
						setTimeout(() => {
							fabCooldown.current = false
						}, 1000)
					}}
					activeOpacity={0.8}>
					<Ionicons
						name='add'
						size={28}
						color='#FFFFFF'
					/>
				</TouchableOpacity>
			)}
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
	datePicker: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginBottom: 16,
		gap: 8,
		alignSelf: 'flex-start',
	},
	dateLabel: { fontSize: 15, fontWeight: '600' },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
	list: { paddingBottom: 80 },
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardText: { flex: 1, marginRight: 12 },
	taskName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
	taskNameCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
	taskDuration: { fontSize: 13 },
	taskHint: { fontSize: 11, marginTop: 2 },
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
})
