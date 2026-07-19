import { PrimaryButton } from '@/components/PrimaryButton'
import { Colors } from '@/constants/theme'
import { API_BASE_URL } from '@/constants/config'
import { useAuth } from '@/context/AuthContext'
import { addSchedule, canScheduleExactAlarms, syncScheduleConfig } from '@/modules/blocker'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	NativeScrollEvent,
	NativeSyntheticEvent,
	PermissionsAndroid,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'

const ITEM_HEIGHT = 32
const VISIBLE_ITEMS = 3
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i)
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)
const AMPM = ['AM', 'PM']

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

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
	const theme = Colors.dark
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
							<View key={i} style={styles.rollerItem}>
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

function AmPmPicker({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
	const theme = Colors.dark
	const scrollRef = useRef<ScrollView | null>(null)
	const mounted = useRef(false)

	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true
			setTimeout(() => {
				scrollRef.current?.scrollTo({ y: selected * ITEM_HEIGHT, animated: false })
			}, 50)
		}
	}, [selected])

	const handleMomentumEnd = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const y = e.nativeEvent.contentOffset.y
			const index = Math.round(y / ITEM_HEIGHT)
			const clamped = Math.max(0, Math.min(index, 1))
			if (clamped !== selected) onSelect(clamped)
		},
		[selected, onSelect],
	)

	const padCount = Math.floor(VISIBLE_ITEMS / 2)

	return (
		<View style={styles.rollerContainer}>
			<Text style={[styles.rollerLabel, { color: theme.icon }]}> </Text>
			<View style={[styles.rollerWrapper, { width: 48 }]}>
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
					{AMPM.map((val, i) => {
						const isSelected = i === selected
						return (
							<View key={i} style={styles.rollerItem}>
								<Text
									style={[
										styles.rollerItemText,
										{ color: isSelected ? theme.text : theme.icon + '60' },
										isSelected && styles.rollerItemSelected,
									]}>
									{val}
								</Text>
							</View>
						)
					})}
				</ScrollView>
			</View>
		</View>
	)
}

export default function NewScheduleScreen() {
	const theme = Colors.dark
	const { t } = useTranslation()
	const router = useRouter()
	const { token } = useAuth()
	const selectedApps = useUiStore(s => s.selectedApps)
	const notificationBlockMode = useUiStore(s => s.notificationBlockMode)

	const [hour12, setHour12] = useState(9)
	const [minute, setMinute] = useState(0)
	const [ampm, setAmpm] = useState(0)
	const [durationHours, setDurationHours] = useState(1)
	const [durationMinutes, setDurationMinutes] = useState(0)
	const [repeatDays, setRepeatDays] = useState<Set<number>>(new Set())
	const [label, setLabel] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(false)

	const toggleDay = (day: number) => {
		setRepeatDays(prev => {
			const next = new Set(prev)
			if (next.has(day)) {
				next.delete(day)
			} else {
				next.add(day)
			}
			return next
		})
	}

	const handleCreate = async () => {
		setError('')

		if (durationHours === 0 && durationMinutes === 0) {
			setError(t('schedules.durationRequired'))
			return
		}

		if (selectedApps.length === 0) {
			setError(t('schedules.noAppsSelected'))
			return
		}

		if (!token) {
			setError(t('common.somethingWentWrong'))
			return
		}

		// setAlarmClock silently no-ops without this (revocable in system
		// settings even though USE_EXACT_ALARM is auto-granted).
		try {
			if (!canScheduleExactAlarms()) {
				setError(t('schedules.exactAlarmRequired'))
				return
			}
		} catch {}

		// Android 13+: schedule started/failed notifications need this grant.
		// A denial doesn't block the schedule — it just stays silent.
		if (Platform.OS === 'android' && Platform.Version >= 33) {
			try {
				await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS')
			} catch {}
		}

		const hour24 = ampm === 0
			? (hour12 === 12 ? 0 : hour12)
			: (hour12 === 12 ? 12 : hour12 + 12)

		setBusy(true)
		try {
			syncScheduleConfig(token, API_BASE_URL, selectedApps, notificationBlockMode)
			addSchedule(
				hour24,
				minute,
				durationHours,
				durationMinutes,
				Array.from(repeatDays),
				label.trim(),
			)
			router.back()
		} catch {
			setError(t('common.somethingWentWrong'))
		} finally {
			setTimeout(() => setBusy(false), 1000)
		}
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name='arrow-back' size={24} color={theme.text} />
				</TouchableOpacity>
				<Text style={[styles.title, { color: theme.text }]}>{t('schedules.createSchedule')}</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
				{error ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>{error}</Text>
					</View>
				) : null}

				<Text style={[styles.inputLabel, { color: theme.icon }]}>{t('schedules.time')}</Text>
				<View style={styles.pickerRow}>
					<RollerPicker data={HOURS_12} selectedIndex={hour12 - 1} onSelect={i => setHour12(i + 1)} label={t('newTask.hours')} />
					<Text style={[styles.pickerSeparator, { color: theme.icon }]}>:</Text>
					<RollerPicker data={MINUTES_60} selectedIndex={minute} onSelect={setMinute} label={t('newTask.minutes')} />
					<View style={{ width: 12 }} />
					<AmPmPicker selected={ampm} onSelect={setAmpm} />
				</View>

				<Text style={[styles.inputLabel, { color: theme.icon }]}>{t('schedules.duration')}</Text>
				<View style={styles.pickerRow}>
					<RollerPicker data={HOURS_24} selectedIndex={durationHours} onSelect={setDurationHours} label={t('newTask.hours')} />
					<Text style={[styles.pickerSeparator, { color: theme.icon }]}>:</Text>
					<RollerPicker data={MINUTES_60} selectedIndex={durationMinutes} onSelect={setDurationMinutes} label={t('newTask.minutes')} />
				</View>

				<Text style={[styles.inputLabel, { color: theme.icon }]}>{t('schedules.repeat')}</Text>
				<View style={styles.daysRow}>
					{DAY_KEYS.map((key, i) => {
						const active = repeatDays.has(i)
						return (
							<TouchableOpacity
								key={i}
								style={[
									styles.dayButton,
									{
										backgroundColor: active ? theme.primary : 'transparent',
										borderColor: active ? theme.primary : theme.border,
									},
								]}
								onPress={() => toggleDay(i)}
								activeOpacity={0.7}>
								<Text style={[styles.dayButtonText, { color: active ? '#FFFFFF' : theme.icon }]}>
									{t(`schedules.days.${key}`)}
								</Text>
							</TouchableOpacity>
						)
					})}
				</View>
				{repeatDays.size === 0 && (
					<Text style={[styles.hintText, { color: theme.icon }]}>{t('schedules.oneTimeHint')}</Text>
				)}

				<Text style={[styles.inputLabel, { color: theme.icon, marginTop: 16 }]}>{t('schedules.label')}</Text>
				<TextInput
					style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
					placeholder={t('schedules.labelPlaceholder')}
					placeholderTextColor={theme.icon + '80'}
					value={label}
					onChangeText={setLabel}
					autoCapitalize='sentences'
				/>
				<Text style={[styles.hintText, { color: theme.icon }]}>{t('schedules.labelHint')}</Text>

				<View style={{ marginTop: 8, marginBottom: 40 }}>
					<PrimaryButton
						title={t('schedules.createSchedule')}
						onPress={handleCreate}
						isLoading={busy}
						disabled={busy}
					/>
				</View>
			</ScrollView>
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
		marginBottom: 4,
	},
	pickerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	pickerSeparator: {
		fontSize: 18,
		fontWeight: '700',
		marginHorizontal: 4,
		marginTop: 14,
	},
	rollerContainer: { alignItems: 'center' },
	rollerLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
	rollerWrapper: {
		height: PICKER_HEIGHT,
		width: 56,
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
	rollerScroll: { height: PICKER_HEIGHT },
	rollerItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
	rollerItemText: { fontSize: 15 },
	rollerItemSelected: { fontWeight: '700', fontSize: 18 },
	daysRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	dayButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dayButtonText: { fontSize: 14, fontWeight: '700' },
	hintText: { fontSize: 12, marginLeft: 4, marginBottom: 8 },
})
