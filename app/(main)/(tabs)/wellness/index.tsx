import { CustomMessageField } from '@/components/CustomMessageField'
import { useTheme } from '@/hooks/useTheme'
import { useBlocker } from '@/hooks/useBlocker'
import { usePermissions } from '@/hooks/usePermissions'
import { useWellness } from '@/hooks/useWellness'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { registerRef, unregisterRef } from '@/components/walkthroughRegistry'

function NumericStepper({
	value,
	min,
	max,
	step,
	unit,
	onValueChange,
	disabled,
}: {
	value: number
	min: number
	max: number
	step: number
	unit: string
	onValueChange: (v: number) => void
	disabled?: boolean
}) {
	const theme = useTheme()

	return (
		<View style={styles.stepperContainer}>
			<TouchableOpacity
				style={[
					styles.stepperButton,
					{ borderColor: theme.border, backgroundColor: theme.surface },
					disabled || value <= min ? { opacity: 0.4 } : null,
				]}
				onPress={() => onValueChange(Math.max(min, value - step))}
				disabled={disabled || value <= min}
				activeOpacity={0.7}>
				<Ionicons
					name='remove'
					size={20}
					color={theme.text}
				/>
			</TouchableOpacity>
			<Text style={[styles.stepperValue, { color: theme.text }]}>
				{value} {unit}
			</Text>
			<TouchableOpacity
				style={[
					styles.stepperButton,
					{ borderColor: theme.border, backgroundColor: theme.surface },
					disabled || value >= max ? { opacity: 0.4 } : null,
				]}
				onPress={() => onValueChange(Math.min(max, value + step))}
				disabled={disabled || value >= max}
				activeOpacity={0.7}>
				<Ionicons
					name='add'
					size={20}
					color={theme.text}
				/>
			</TouchableOpacity>
		</View>
	)
}

export default function WellnessScreen() {
	const theme = useTheme()
	const { t } = useTranslation()
	const router = useRouter()
	const { isBlocking } = useBlocker()
	const { allGranted } = usePermissions()
	const customMessageEye = useUiStore(s => s.customMessageEye)
	const setCustomMessageEye = useUiStore(s => s.setCustomMessageEye)
	const customMessageAppMonitor = useUiStore(s => s.customMessageAppMonitor)
	const setCustomMessageAppMonitor = useUiStore(s => s.setCustomMessageAppMonitor)
	// Seed the field with the saved message, or the previous default when unset.
	const [eyeMsg, setEyeMsg] = useState(() => customMessageEye || t('customMessages.defaultEye'))
	const [appMsg, setAppMsg] = useState(() => customMessageAppMonitor || t('customMessages.defaultAppMonitor'))
	const {
		eyeBlinkerEnabled,
		eyeBlinkerIntervalMinutes,
		eyeBlinkerDurationSeconds,
		autoBlockEnabled,
		autoBlockUsageLimitMinutes,
		autoBlockDurationSeconds,
		selectedAppsCount,
		updateEyeBlinker,
		updateAutoBlock,
	} = useWellness()

	const eyeBlinkerRef = useRef<View>(null)
	const doomScrollRef = useRef<View>(null)

	useEffect(() => {
		registerRef('wellness-eyeblinker', eyeBlinkerRef)
		registerRef('wellness-doomscroll', doomScrollRef)
		return () => { unregisterRef('wellness-eyeblinker'); unregisterRef('wellness-doomscroll') }
	}, [])

	const handleEyeBlinkerToggle = (v: boolean) => {
		if (v && !allGranted) {
			router.push('/(setup)/permissions')
			return
		}
		updateEyeBlinker(v, eyeBlinkerIntervalMinutes, eyeBlinkerDurationSeconds)
	}

	const handleAutoBlockToggle = (v: boolean) => {
		if (v && !allGranted) {
			router.push('/(setup)/permissions')
			return
		}
		updateAutoBlock(v, autoBlockUsageLimitMinutes, autoBlockDurationSeconds)
	}

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.background }]}
			contentContainerStyle={styles.content}>
			<Text style={[styles.title, { color: theme.text }]}>{t('wellness.title')}</Text>

			{isBlocking ? (
				<View style={[styles.lockBanner, { backgroundColor: theme.primary + '1A', borderColor: theme.primary }]}>
					<Ionicons
						name='lock-closed'
						size={18}
						color={theme.primary}
					/>
					<Text style={[styles.lockBannerText, { color: theme.text }]}>{t('settings.locked')}</Text>
				</View>
			) : null}

			{!allGranted ? (
				<View style={[styles.permsBanner, { backgroundColor: theme.accent + '1A' }]}>
					<Ionicons
						name='warning-outline'
						size={20}
						color={theme.accent}
					/>
					<Text style={[styles.permsBannerText, { color: theme.accent }]}>{t('newTask.permsRequired')}</Text>
				</View>
			) : null}

			{/* Eye Blinker */}
			<Text style={[styles.sectionTitle, { color: theme.icon }]}>{t('wellness.eyeCare')}</Text>
			<View ref={eyeBlinkerRef} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
				<View style={styles.toggleRow}>
					<View style={styles.toggleInfo}>
						<Ionicons
							name='eye-outline'
							size={20}
							color={theme.icon}
						/>
						<View style={styles.rowText}>
							<Text style={[styles.label, { color: theme.text }]}>{t('wellness.eyeBlinker')}</Text>
							<Text style={[styles.hint, { color: theme.icon }]}>{t('wellness.eyeBlinkerHint')}</Text>
						</View>
					</View>
					<Switch
						value={eyeBlinkerEnabled}
						onValueChange={handleEyeBlinkerToggle}
						trackColor={{ false: theme.border, true: theme.primary }}
						thumbColor='#FFFFFF'
						disabled={isBlocking || autoBlockEnabled}
					/>
				</View>

				<View style={styles.configSection}>
					<View style={styles.configRow}>
						<Text style={[styles.configLabel, { color: theme.icon }]}>{t('wellness.reminderInterval')}</Text>
						<NumericStepper
							value={eyeBlinkerIntervalMinutes}
							min={1}
							max={60}
							step={1}
							unit={t('wellness.min')}
							onValueChange={v => updateEyeBlinker(eyeBlinkerEnabled, v, eyeBlinkerDurationSeconds)}
							disabled={isBlocking}
						/>
					</View>
					<View style={[styles.divider, { backgroundColor: theme.border }]} />
					<View style={styles.configRow}>
						<Text style={[styles.configLabel, { color: theme.icon }]}>{t('wellness.restDuration')}</Text>
						<NumericStepper
							value={eyeBlinkerDurationSeconds}
							min={1}
							max={60}
							step={1}
							unit={t('wellness.sec')}
							onValueChange={v => updateEyeBlinker(eyeBlinkerEnabled, eyeBlinkerIntervalMinutes, v)}
							disabled={isBlocking}
						/>
					</View>
					<Text style={[styles.description, { color: theme.icon }]}>
						{t('wellness.eyeBlinkerDesc', {
							interval: eyeBlinkerIntervalMinutes,
							duration: eyeBlinkerDurationSeconds,
						})}
					</Text>

					<View style={styles.messageField}>
						<CustomMessageField
							value={eyeMsg}
							onChangeText={v => {
								setEyeMsg(v)
								setCustomMessageEye(v)
							}}
						/>
					</View>
				</View>
			</View>

			{/* Doom Scroll Breaker */}
			<Text style={[styles.sectionTitle, { color: theme.icon }]}>{t('wellness.doomScrollBreaker')}</Text>
			<View ref={doomScrollRef} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
				<View style={styles.toggleRow}>
					<View style={styles.toggleInfo}>
						<Ionicons
							name='hourglass-outline'
							size={20}
							color={theme.icon}
						/>
						<View style={styles.rowText}>
							<Text style={[styles.label, { color: theme.text }]}>{t('wellness.autoBlock')}</Text>
							<Text style={[styles.hint, { color: theme.icon }]}>{t('wellness.autoBlockHint')}</Text>
						</View>
					</View>
					<Switch
						value={autoBlockEnabled}
						onValueChange={handleAutoBlockToggle}
						trackColor={{ false: theme.border, true: theme.primary }}
						thumbColor='#FFFFFF'
						disabled={isBlocking || eyeBlinkerEnabled}
					/>
				</View>

				<View style={styles.configSection}>
					<View style={styles.configRow}>
						<Text style={[styles.configLabel, { color: theme.icon }]}>{t('wellness.usageLimit')}</Text>
						<NumericStepper
							value={autoBlockUsageLimitMinutes}
							min={1}
							max={60}
							step={1}
							unit={t('wellness.min')}
							onValueChange={v => updateAutoBlock(autoBlockEnabled, v, autoBlockDurationSeconds)}
							disabled={isBlocking}
						/>
					</View>
					<View style={[styles.divider, { backgroundColor: theme.border }]} />
					<View style={styles.configRow}>
						<Text style={[styles.configLabel, { color: theme.icon }]}>{t('wellness.breakDuration')}</Text>
						<NumericStepper
							value={autoBlockDurationSeconds}
							min={1}
							max={120}
							step={1}
							unit={t('wellness.sec')}
							onValueChange={v => updateAutoBlock(autoBlockEnabled, autoBlockUsageLimitMinutes, v)}
							disabled={isBlocking}
						/>
					</View>

					<View style={[styles.appsNote, { backgroundColor: theme.background, borderColor: theme.border }]}>
						<Ionicons
							name='apps-outline'
							size={16}
							color={theme.icon}
						/>
						<Text style={[styles.appsNoteText, { color: theme.icon }]}>{t('wellness.monitorsApps')}</Text>
						<View style={[styles.badge, { backgroundColor: theme.primary }]}>
							<Text style={styles.badgeText}>{selectedAppsCount}</Text>
						</View>
					</View>

					<Text style={[styles.description, { color: theme.icon }]}>
						{t('wellness.autoBlockDesc', {
							limit: autoBlockUsageLimitMinutes,
							duration: autoBlockDurationSeconds,
						})}
					</Text>

					<View style={styles.messageField}>
						<CustomMessageField
							value={appMsg}
							onChangeText={v => {
								setAppMsg(v)
								setCustomMessageAppMonitor(v)
							}}
						/>
					</View>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 24,
		paddingTop: 40,
		paddingBottom: 40,
	},
	title: {
		fontSize: 32,
		fontWeight: '700',
		marginBottom: 24,
	},
	lockBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 24,
	},
	lockBannerText: {
		fontSize: 14,
		fontWeight: '500',
		flex: 1,
	},
	permsBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		marginBottom: 24,
	},
	permsBannerText: {
		fontSize: 13,
		fontWeight: '600',
		flex: 1,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 8,
		marginLeft: 4,
		letterSpacing: 1,
	},
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	toggleInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	rowText: {
		marginLeft: 12,
		flex: 1,
	},
	label: {
		fontSize: 15,
		fontWeight: '600',
	},
	hint: {
		fontSize: 12,
		marginTop: 2,
	},
	configSection: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#272735',
	},
	configRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	configLabel: {
		fontSize: 14,
		fontWeight: '500',
	},
	divider: {
		height: 1,
		marginVertical: 4,
	},
	description: {
		fontSize: 12,
		marginTop: 12,
		lineHeight: 18,
	},
	messageField: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#272735',
	},
	stepperContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	stepperButton: {
		width: 36,
		height: 36,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepperValue: {
		fontSize: 14,
		fontWeight: '600',
		minWidth: 60,
		textAlign: 'center',
	},
	appsNote: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		marginTop: 12,
	},
	appsNoteText: {
		fontSize: 13,
		flex: 1,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
		minWidth: 24,
		alignItems: 'center',
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
})
