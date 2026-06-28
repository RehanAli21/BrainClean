import { PrimaryButton } from '@/components/PrimaryButton'
import { isWalkthroughActive, registerRef, unregisterRef } from '@/components/walkthroughRegistry'
import { Colors } from '@/constants/theme'
import { useCreateTaskMutation } from '@/hooks/queries/useTasks'
import { usePermissions } from '@/hooks/usePermissions'
import { taskService } from '@/services/api/tasks'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

function getTodayDate(): string {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function clampTimeInput(text: string, max: number): string {
	const cleaned = text.replace(/[^0-9]/g, '')
	if (cleaned === '') return ''
	const num = parseInt(cleaned, 10)
	if (num < 0) return '0'
	if (num > max) return String(max)
	return String(num)
}

const createTaskSchema = z.object({
	name: z.string().min(1, 'Task name is required').max(255, 'Task name is too long'),
	durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
	maxDurationMinutes: z.number().min(1, 'Max duration must be at least 1 minute').max(1440, 'Max duration cannot exceed 24 hours'),
}).refine(data => data.maxDurationMinutes >= data.durationMinutes, {
	message: 'Max duration must be greater than or equal to min duration',
	path: ['maxDurationMinutes'],
})

export default function NewTaskScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const queryClient = useQueryClient()
	const createMutation = useCreateTaskMutation()
	const { isLoading: permsLoading, allGranted } = usePermissions()

	const [name, setName] = useState('')
	const [minHours, setMinHours] = useState('')
	const [minMinutes, setMinMinutes] = useState('')
	const [maxHours, setMaxHours] = useState('10')
	const [maxMinutes, setMaxMinutes] = useState('0')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const nameRef = useRef<View>(null)
	const minRef = useRef<View>(null)
	const maxRef = useRef<View>(null)
	const createRef = useRef<View>(null)

	useEffect(() => {
		registerRef('newtask-name', nameRef)
		registerRef('newtask-min', minRef)
		registerRef('newtask-max', maxRef)
		registerRef('newtask-create', createRef)
		return () => {
			unregisterRef('newtask-name')
			unregisterRef('newtask-min')
			unregisterRef('newtask-max')
			unregisterRef('newtask-create')
		}
	}, [])

	const handleCreate = () => {
		setErrors({})
		setApiError('')

		const totalMin = (parseInt(minHours, 10) || 0) * 60 + (parseInt(minMinutes, 10) || 0)
		const totalMax = (parseInt(maxHours, 10) || 0) * 60 + (parseInt(maxMinutes, 10) || 0)

		const result = createTaskSchema.safeParse({
			name: name.trim(),
			durationMinutes: totalMin,
			maxDurationMinutes: totalMax,
		})

		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of result.error.issues) {
				const key = issue.path[0] as string
				if (!fieldErrors[key]) fieldErrors[key] = issue.message
			}
			setErrors(fieldErrors)
			return
		}

		createMutation.mutate(
			{
				name: result.data.name,
				minimumDurationSeconds: result.data.durationMinutes * 60,
				maximumDurationSeconds: result.data.maxDurationMinutes * 60,
			},
			{
				onSuccess: (task) => {
					router.replace({
						pathname: '/(main)/(tabs)/tasks/[taskId]',
						params: { taskId: task.id },
					})
				},
				onError: async (err: any) => {
					console.error('[NewTask] Create failed:', err.response?.status, err.response?.data ?? err.message)
					const code = err.response?.data?.error
					if (code === 'VALIDATION_ERROR') {
						setApiError(err.response?.data?.message || 'Invalid input.')
					} else if (code === 'ACTIVE_TASK_EXISTS') {
						const details = err.response?.data?.details
						if (details?.id) {
							router.replace({
								pathname: '/(main)/(tabs)/tasks/[taskId]',
								params: { taskId: details.id, finishFirst: '1' },
							})
						} else {
							setApiError('You already have an active task. Complete it first.')
						}
					} else if (!err.response) {
						try {
							const tasks = await queryClient.fetchQuery({
								queryKey: ['tasks', getTodayDate()],
								queryFn: () => taskService.getByDate(getTodayDate()),
							})
							const created = tasks.find(t => t.name === result.data.name)
							if (created) {
								router.replace({
									pathname: '/(main)/(tabs)/tasks/[taskId]',
									params: { taskId: created.id },
								})
								return
							}
						} catch {}
						setApiError('Something went wrong. Please try again.')
					} else {
						setApiError('Something went wrong. Please try again.')
					}
				},
			},
		)
	}

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
				<Text style={[styles.title, { color: theme.text }]}>New Task</Text>
				<View style={{ width: 24 }} />
			</View>

			{permsLoading ? (
				<View style={styles.centered}>
					<ActivityIndicator
						size='large'
						color={theme.primary}
					/>
				</View>
			) : !allGranted && !isWalkthroughActive() ? (
				<View style={styles.form}>
					<View style={[styles.permsBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Ionicons
							name='warning-outline'
							size={20}
							color={theme.accent}
						/>
						<Text style={[styles.permsBannerText, { color: theme.accent }]}>
							All permissions must be granted before you can create a task.
						</Text>
					</View>
					<Text style={[styles.permsHint, { color: theme.icon }]}>
						BrainClean needs Usage Access, Display Over Other Apps, and Unrestricted Background permissions to block apps during your
						focus sessions.
					</Text>
					<View style={{ marginTop: 16 }}>
						<PrimaryButton
							title='Grant Permissions'
							onPress={() => router.push('/(setup)/permissions')}
						/>
					</View>
				</View>
			) : (
				<View style={styles.form}>
					{apiError ? (
						<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
							<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
						</View>
					) : null}

					<View ref={nameRef}>
					<Text style={[styles.inputLabel, { color: theme.icon }]}>Task Name</Text>
					<TextInput
						style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
						placeholder='e.g. Read 10 pages'
						placeholderTextColor={theme.icon + '80'}
						value={name}
						onChangeText={setName}
						autoCapitalize='sentences'
					/>
					</View>
					{errors.name ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.name}</Text> : null}

					<View ref={minRef}>
					<Text style={[styles.inputLabel, { color: theme.icon }]}>Min Duration</Text>
					<View style={styles.timeRow}>
						<View style={styles.timeField}>
							<TextInput
								style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
								placeholder='0'
								placeholderTextColor={theme.icon + '80'}
								value={minHours}
								onChangeText={t => setMinHours(clampTimeInput(t, 24))}
								keyboardType='number-pad'
								maxLength={2}
							/>
							<Text style={[styles.timeUnit, { color: theme.icon }]}>hrs</Text>
						</View>
						<View style={styles.timeField}>
							<TextInput
								style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
								placeholder='0'
								placeholderTextColor={theme.icon + '80'}
								value={minMinutes}
								onChangeText={t => setMinMinutes(clampTimeInput(t, 59))}
								keyboardType='number-pad'
								maxLength={2}
							/>
							<Text style={[styles.timeUnit, { color: theme.icon }]}>min</Text>
						</View>
					</View>
					</View>
					{errors.durationMinutes ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.durationMinutes}</Text> : null}

					<View ref={maxRef}>
					<Text style={[styles.inputLabel, { color: theme.icon }]}>Max Duration</Text>
					<View style={styles.timeRow}>
						<View style={styles.timeField}>
							<TextInput
								style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
								placeholder='0'
								placeholderTextColor={theme.icon + '80'}
								value={maxHours}
								onChangeText={t => setMaxHours(clampTimeInput(t, 24))}
								keyboardType='number-pad'
								maxLength={2}
							/>
							<Text style={[styles.timeUnit, { color: theme.icon }]}>hrs</Text>
						</View>
						<View style={styles.timeField}>
							<TextInput
								style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
								placeholder='0'
								placeholderTextColor={theme.icon + '80'}
								value={maxMinutes}
								onChangeText={t => setMaxMinutes(clampTimeInput(t, 59))}
								keyboardType='number-pad'
								maxLength={2}
							/>
							<Text style={[styles.timeUnit, { color: theme.icon }]}>min</Text>
						</View>
					</View>
					</View>
					<Text style={[styles.hintText, { color: theme.icon }]}>Auto-unblock after this duration</Text>
					{errors.maxDurationMinutes ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.maxDurationMinutes}</Text> : null}

					<View ref={createRef} style={{ marginTop: 8 }}>
						<PrimaryButton
							title='Create Task'
							onPress={handleCreate}
							isLoading={createMutation.isPending}
						/>
					</View>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 32,
		paddingTop: 16,
	},
	backButton: { padding: 4 },
	title: { fontSize: 20, fontWeight: '700' },
	form: { width: '100%' },
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
	textInput: {
		borderWidth: 1,
		borderRadius: 12,
		height: 50,
		paddingHorizontal: 16,
		fontSize: 16,
		marginBottom: 16,
	},
	timeRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	timeField: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timeInput: {
		borderWidth: 1,
		borderRadius: 12,
		height: 50,
		flex: 1,
		textAlign: 'center',
		fontSize: 18,
		fontWeight: '600',
	},
	timeUnit: { fontSize: 14, fontWeight: '500' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
	hintText: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
	permsBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 8,
		marginBottom: 12,
	},
	permsBannerText: { fontSize: 14, fontWeight: '500', flex: 1 },
	permsHint: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
