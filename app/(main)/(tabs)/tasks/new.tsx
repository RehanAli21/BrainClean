import { CustomMessageField } from '@/components/CustomMessageField'
import { NotificationModeSelector } from '@/components/NotificationModeSelector'
import { PrimaryButton } from '@/components/PrimaryButton'
import { isWalkthroughActive, registerRef, unregisterRef } from '@/components/walkthroughRegistry'
import { useTheme } from '@/hooks/useTheme'
import { usePermissions } from '@/hooks/usePermissions'
import { analytics } from '@/services/analytics'
import { isTaskActive, useTaskStore } from '@/store/taskStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ActivityIndicator,
	NativeScrollEvent,
	NativeSyntheticEvent,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { z } from 'zod'

const ITEM_HEIGHT = 32
const VISIBLE_ITEMS = 3
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function RollerPicker({
	data,
	selectedIndex,
	onSelect,
	label,
}: {
	data: number[]
	selectedIndex: number
	onSelect: (index: number) => void
	label: string
}) {
	const theme = useTheme()
	const scrollRef = useRef<ScrollView | null>(null)
	const mounted = useRef(false)

	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true
			setTimeout(() => {
				scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false })
			}, 50)
		}
	}, [selectedIndex])

	const handleMomentumEnd = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const y = e.nativeEvent.contentOffset.y
			const index = Math.round(y / ITEM_HEIGHT)
			const clamped = Math.max(0, Math.min(index, data.length - 1))
			if (clamped !== selectedIndex) {
				onSelect(clamped)
			}
		},
		[data.length, selectedIndex, onSelect],
	)

	const padCount = Math.floor(VISIBLE_ITEMS / 2)

	return (
		<View style={styles.rollerContainer}>
			<Text style={[styles.rollerLabel, { color: theme.icon }]}>{label}</Text>
			<View style={styles.rollerWrapper}>
				<View style={[styles.rollerHighlight, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '40' }]} />
				<ScrollView
					ref={scrollRef}
					style={styles.rollerScroll}
					contentContainerStyle={{ paddingVertical: padCount * ITEM_HEIGHT }}
					showsVerticalScrollIndicator={false}
					snapToInterval={ITEM_HEIGHT}
					decelerationRate='fast'
					onMomentumScrollEnd={handleMomentumEnd}
					nestedScrollEnabled>
					{data.map((value, i) => {
						const isSelected = i === selectedIndex
						return (
							<View
								key={i}
								style={styles.rollerItem}>
								<Text
									style={[
										styles.rollerItemText,
										{ color: isSelected ? theme.text : theme.icon + '60' },
										isSelected && styles.rollerItemSelected,
									]}>
									{String(value).padStart(2, '0')}
								</Text>
							</View>
						)
					})}
				</ScrollView>
			</View>
		</View>
	)
}

export default function NewTaskScreen() {
	const theme = useTheme()
	const { t } = useTranslation()
	const router = useRouter()
	const addTask = useTaskStore(s => s.addTask)
	const { isLoading: permsLoading, allGranted } = usePermissions()

	const [name, setName] = useState('')
	const [hours, setHours] = useState(1)
	const [minutes, setMinutes] = useState(0)
	const [autoComplete, setAutoComplete] = useState(false)
	const [maxHours, setMaxHours] = useState(10)
	const [maxMinutes, setMaxMinutes] = useState(0)
	const [notifMode, setNotifMode] = useState(0)
	const [customMessage, setCustomMessage] = useState(() => t('customMessages.defaultBlock'))
	const [errors, setErrors] = useState<Record<string, string>>({})
	const nameRef = useRef<View | null>(null)
	const durationRef = useRef<View | null>(null)
	const notifRef = useRef<View | null>(null)
	const createRef = useRef<View | null>(null)

	const createTaskSchema = useMemo(() => z.object({
		name: z.string().min(1, t('validation.taskNameRequired')).max(255, t('validation.taskNameMax')),
		durationMinutes: z.number().min(1, t('validation.durationMin')).max(1440, t('validation.durationMax')),
	}), [t])

	useEffect(() => {
		registerRef('newtask-name', nameRef)
		registerRef('newtask-duration', durationRef)
		registerRef('newtask-notif', notifRef)
		registerRef('newtask-create', createRef)
		return () => {
			unregisterRef('newtask-name')
			unregisterRef('newtask-duration')
			unregisterRef('newtask-notif')
			unregisterRef('newtask-create')
		}
	}, [])

	const handleCreate = () => {
		setErrors({})

		// One task at a time: send the user to the running one instead.
		const active = useTaskStore.getState().tasks.find(isTaskActive)
		if (active) {
			router.replace({
				pathname: '/(main)/(tabs)/tasks/[taskId]',
				params: { taskId: active.id, finishFirst: '1' },
			})
			return
		}

		const totalMinutes = hours * 60 + minutes

		const result = createTaskSchema.safeParse({
			name: name.trim(),
			durationMinutes: totalMinutes,
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

		const durationSeconds = result.data.durationMinutes * 60

		let maxSeconds: number | null = null

		if (autoComplete) {
			const totalMaxMinutes = maxHours * 60 + maxMinutes
			if (totalMaxMinutes <= result.data.durationMinutes) {
				setErrors({ maxDuration: t('newTask.autoCompleteError') })
				return
			}
			maxSeconds = totalMaxMinutes * 60
		}

		const task = addTask({
			name: result.data.name,
			minimumDurationSeconds: durationSeconds,
			maximumDurationSeconds: maxSeconds,
			notificationBlockMode: notifMode,
			customMessage,
		})
		analytics.track('task_created', {
			taskId: task.id,
			hasMaxDuration: task.maximumDurationSeconds != null,
		})
		router.replace({
			pathname: '/(main)/(tabs)/tasks/[taskId]',
			params: { taskId: task.id },
		})
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
				<Text style={[styles.title, { color: theme.text }]}>{t('newTask.title')}</Text>
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
							{t('newTask.permsRequired')}
						</Text>
					</View>
					<Text style={[styles.permsHint, { color: theme.icon }]}>
						{t('newTask.permsHint')}
					</Text>
					<View style={{ marginTop: 16 }}>
						<PrimaryButton
							title={t('newTask.grantPerms')}
							onPress={() => router.push('/(setup)/permissions')}
						/>
					</View>
				</View>
			) : (
				<ScrollView
					style={styles.form}
					contentContainerStyle={styles.formContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps='handled'>
					<View ref={nameRef}>
						<Text style={[styles.inputLabel, { color: theme.icon }]}>{t('newTask.taskName')}</Text>
						<TextInput
							style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
							placeholder={t('newTask.taskNamePlaceholder')}
							placeholderTextColor={theme.icon + '80'}
							value={name}
							onChangeText={setName}
							autoCapitalize='sentences'
						/>
					</View>
					{errors.name ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.name}</Text> : null}

					<View ref={durationRef}>
						<Text style={[styles.inputLabel, { color: theme.icon }]}>{t('newTask.duration')}</Text>
						<View style={styles.pickerRow}>
							<RollerPicker
								data={HOURS}
								selectedIndex={hours}
								onSelect={setHours}
								label={t('newTask.hours')}
							/>
							<Text style={[styles.pickerSeparator, { color: theme.icon }]}>:</Text>
							<RollerPicker
								data={MINUTES}
								selectedIndex={minutes}
								onSelect={setMinutes}
								label={t('newTask.minutes')}
							/>
						</View>
						<Text style={[styles.hintText, { color: theme.icon }]}>{t('newTask.blockedHint')}</Text>
					</View>
					{errors.durationMinutes ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.durationMinutes}</Text> : null}

					<View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
						<View style={styles.toggleInfo}>
							<Text style={[styles.toggleTitle, { color: theme.text }]}>{t('newTask.autoCompleteToggle')}</Text>
							<Text style={[styles.toggleHint, { color: theme.icon }]}>{t('newTask.autoCompleteHint')}</Text>
						</View>
						<Switch
							value={autoComplete}
							onValueChange={setAutoComplete}
							trackColor={{ false: theme.border, true: theme.primary }}
							thumbColor={theme.text}
						/>
					</View>

					{autoComplete ? (
						<View>
							<Text style={[styles.inputLabel, { color: theme.icon }]}>{t('newTask.autoCompleteAfter')}</Text>
							<View style={styles.pickerRow}>
								<RollerPicker
									data={HOURS}
									selectedIndex={maxHours}
									onSelect={setMaxHours}
									label={t('newTask.hours')}
								/>
								<Text style={[styles.pickerSeparator, { color: theme.icon }]}>:</Text>
								<RollerPicker
									data={MINUTES}
									selectedIndex={maxMinutes}
									onSelect={setMaxMinutes}
									label={t('newTask.minutes')}
								/>
							</View>
							<Text style={[styles.hintText, { color: theme.icon }]}>{t('newTask.autoCompleteDesc')}</Text>
							{errors.maxDuration ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.maxDuration}</Text> : null}
						</View>
					) : null}

					<NotificationModeSelector ref={notifRef} value={notifMode} onChange={setNotifMode} />

					<CustomMessageField value={customMessage} onChangeText={setCustomMessage} />

					<View
						ref={createRef}
						style={{ marginTop: 8 }}>
						<PrimaryButton
							title={t('newTask.createTask')}
							onPress={handleCreate}
						/>
					</View>
				</ScrollView>
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
	formContent: { paddingBottom: 48 },
	inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
	textInput: {
		borderWidth: 1,
		borderRadius: 12,
		height: 50,
		paddingHorizontal: 16,
		fontSize: 16,
		marginBottom: 16,
	},
	pickerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	pickerSeparator: {
		fontSize: 18,
		fontWeight: '700',
		marginHorizontal: 4,
		marginTop: 14,
	},
	rollerContainer: {
		alignItems: 'center',
	},
	rollerLabel: {
		fontSize: 11,
		fontWeight: '500',
		marginBottom: 4,
	},
	rollerWrapper: {
		height: PICKER_HEIGHT,
		width: 56,
		borderWidth: 0,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: 'transparent',
	},
	rollerHighlight: {
		position: 'absolute',
		top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
		left: 2,
		right: 2,
		height: ITEM_HEIGHT,
		borderRadius: 6,
		borderWidth: 1,
	},
	rollerScroll: {
		height: PICKER_HEIGHT,
	},
	rollerItem: {
		height: ITEM_HEIGHT,
		justifyContent: 'center',
		alignItems: 'center',
	},
	rollerItemText: {
		fontSize: 15,
	},
	rollerItemSelected: {
		fontWeight: '700',
		fontSize: 18,
	},
	fieldError: { fontSize: 12, marginTop: -4, marginBottom: 8, marginLeft: 4 },
	hintText: { fontSize: 12, marginLeft: 4, marginBottom: 16 },
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
	},
	toggleInfo: { flex: 1, marginRight: 12 },
	toggleTitle: { fontSize: 15, fontWeight: '600' },
	toggleHint: { fontSize: 12, marginTop: 2 },
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
