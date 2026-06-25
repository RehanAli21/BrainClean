import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { useCreateTaskMutation } from '@/hooks/queries/useTasks'
import { usePermissions } from '@/hooks/usePermissions'
import { taskService } from '@/services/api/tasks'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

function getTodayDate(): string {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const createTaskSchema = z.object({
	name: z.string().min(1, 'Task name is required').max(255, 'Task name is too long'),
	durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
})

export default function NewTaskScreen() {
	const theme = Colors.dark
	const router = useRouter()
	const queryClient = useQueryClient()
	const createMutation = useCreateTaskMutation()
	const { isLoading: permsLoading, allGranted } = usePermissions()
	const maxBlockTimeMinutes = useUiStore(s => s.maxBlockTimeMinutes)

	const [name, setName] = useState('')
	const [durationMinutes, setDurationMinutes] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')

	const handleCreate = () => {
		setErrors({})
		setApiError('')

		const parsed = parseInt(durationMinutes, 10)
		const result = createTaskSchema.safeParse({
			name: name.trim(),
			durationMinutes: isNaN(parsed) ? 0 : parsed,
		})

		console.log(result)

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
				maximumDurationSeconds: maxBlockTimeMinutes * 60,
			},
			{
				onSuccess: () => router.back(),
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
							if (tasks.some(t => t.name === result.data.name)) {
								router.back()
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
			) : !allGranted ? (
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

					<AuthInput
						label='Task Name'
						placeholder='e.g. Read 10 pages'
						value={name}
						onChangeText={setName}
						autoCapitalize='sentences'
					/>
					{errors.name ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.name}</Text> : null}

					<AuthInput
						label='Duration (minutes)'
						placeholder='e.g. 10'
						value={durationMinutes}
						onChangeText={setDurationMinutes}
						keyboardType='numeric'
					/>
					{errors.durationMinutes ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.durationMinutes}</Text> : null}

					<View style={{ marginTop: 8 }}>
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
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
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
