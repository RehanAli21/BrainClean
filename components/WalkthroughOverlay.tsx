import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getRef, setWalkthroughActive } from './walkthroughRegistry'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HIGHLIGHT_PADDING = 8
const HIGHLIGHT_RADIUS = 12

interface WalkthroughStep {
	key: string
	route: string
	titleKey: string
	descriptionKey: string
	tooltipPosition: 'top' | 'bottom'
	requiresAuth?: boolean
}

const STEPS: WalkthroughStep[] = [
	{
		key: 'wellness-eyeblinker',
		route: '/(main)/(tabs)/wellness',
		titleKey: 'walkthrough.eyeBlinker',
		descriptionKey: 'walkthrough.eyeBlinkerDesc',
		tooltipPosition: 'bottom',
	},
	{
		key: 'wellness-doomscroll',
		route: '/(main)/(tabs)/wellness',
		titleKey: 'walkthrough.doomScroll',
		descriptionKey: 'walkthrough.doomScrollDesc',
		tooltipPosition: 'top',
	},
	{
		key: 'tasks-fab',
		route: '/(main)/(tabs)/tasks',
		titleKey: 'walkthrough.createTask',
		descriptionKey: 'walkthrough.createTaskDesc',
		tooltipPosition: 'top',
		requiresAuth: true,
	},
	{
		key: 'tasks-date',
		route: '/(main)/(tabs)/tasks',
		titleKey: 'walkthrough.filterDate',
		descriptionKey: 'walkthrough.filterDateDesc',
		tooltipPosition: 'bottom',
		requiresAuth: true,
	},
	{
		key: 'newtask-name',
		route: '/(main)/(tabs)/tasks/new',
		titleKey: 'walkthrough.taskName',
		descriptionKey: 'walkthrough.taskNameDesc',
		tooltipPosition: 'bottom',
		requiresAuth: true,
	},
	{
		key: 'newtask-duration',
		route: '/(main)/(tabs)/tasks/new',
		titleKey: 'walkthrough.duration',
		descriptionKey: 'walkthrough.durationDesc',
		tooltipPosition: 'bottom',
		requiresAuth: true,
	},
	{
		key: 'newtask-create',
		route: '/(main)/(tabs)/tasks/new',
		titleKey: 'walkthrough.createButton',
		descriptionKey: 'walkthrough.createButtonDesc',
		tooltipPosition: 'top',
		requiresAuth: true,
	},
	{
		key: 'apps-search',
		route: '/(main)/(tabs)/apps',
		titleKey: 'walkthrough.findApps',
		descriptionKey: 'walkthrough.findAppsDesc',
		tooltipPosition: 'bottom',
	},
	{
		key: 'schedules-fab',
		route: '/(main)/(tabs)/schedules',
		titleKey: 'walkthrough.schedules',
		descriptionKey: 'walkthrough.schedulesDesc',
		tooltipPosition: 'top',
		requiresAuth: true,
	},
	{
		key: 'settings-notifications',
		route: '/(main)/(tabs)/settings',
		titleKey: 'walkthrough.notifModes',
		descriptionKey: 'walkthrough.notifModesDesc',
		tooltipPosition: 'bottom',
		requiresAuth: true,
	},
	{
		key: 'settings-permissions',
		route: '/(main)/(tabs)/settings',
		titleKey: 'walkthrough.grantPerms',
		descriptionKey: 'walkthrough.grantPermsDesc',
		tooltipPosition: 'top',
	},
	{
		key: 'tasks-feedback',
		route: '/(main)/(tabs)/tasks',
		titleKey: 'walkthrough.feedback',
		descriptionKey: 'walkthrough.feedbackDesc',
		tooltipPosition: 'top',
		requiresAuth: true,
	},
]

interface TargetRect {
	x: number
	y: number
	width: number
	height: number
}

interface Props {
	visible: boolean
	onClose: () => void
}

export function WalkthroughOverlay({ visible, onClose }: Props) {
	const theme = useTheme()
	const { t } = useTranslation()
	const router = useRouter()
	const { token } = useAuth()
	const setTutorialSeen = useUiStore(s => s.setTutorialSeen)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
	const measureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	const activeSteps = useMemo(
		() => (token ? STEPS : STEPS.filter(s => !s.requiresAuth)),
		[token],
	)

	const step = activeSteps[currentIndex]

	const measureTarget = useCallback(() => {
		if (!visible || !step) return
		const ref = getRef(step.key)
		if (!ref?.current) {
			setTargetRect(null)
			return
		}
		ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
			if (w > 0 && h > 0) {
				setTargetRect({
					x: x - HIGHLIGHT_PADDING,
					y: y - HIGHLIGHT_PADDING + 20,
					width: w + HIGHLIGHT_PADDING * 2,
					height: h + HIGHLIGHT_PADDING * 3.5,
				})
			} else {
				setTargetRect(null)
			}
		})
	}, [visible, step])

	useEffect(() => {
		if (!visible) {
			setCurrentIndex(0)
			setTargetRect(null)
			setWalkthroughActive(false)
			return
		}
		setWalkthroughActive(true)
		router.navigate(step.route as any)
		measureTimer.current = setTimeout(measureTarget, 400)
		return () => clearTimeout(measureTimer.current)
	}, [visible, currentIndex])

	const handleNext = () => {
		if (currentIndex < activeSteps.length - 1) {
			setTargetRect(null)
			setCurrentIndex(currentIndex + 1)
		} else {
			handleFinish()
		}
	}

	const handleFinish = () => {
		setTutorialSeen(true)
		setCurrentIndex(0)
		setTargetRect(null)
		router.navigate('/(main)/(tabs)/wellness' as any)
		onClose()
	}

	if (!visible || !step) return null

	const isLast = currentIndex === activeSteps.length - 1

	return (
		<Modal
			visible
			transparent
			animationType='fade'
			statusBarTranslucent>
			<View style={styles.container}>
				{targetRect ? (
					<>
						<View style={[styles.darkRegion, { top: 0, left: 0, right: 0, height: targetRect.y }]} />
						<View style={[styles.darkRegion, { top: targetRect.y + targetRect.height, left: 0, right: 0, bottom: 0 }]} />
						<View style={[styles.darkRegion, { top: targetRect.y, left: 0, width: targetRect.x, height: targetRect.height }]} />
						<View
							style={[
								styles.darkRegion,
								{ top: targetRect.y, left: targetRect.x + targetRect.width, right: 0, height: targetRect.height },
							]}
						/>

						<View
							style={[
								styles.highlightBorder,
								{
									top: targetRect.y,
									left: targetRect.x,
									width: targetRect.width,
									height: targetRect.height,
									borderColor: theme.primary,
								},
							]}
						/>
					</>
				) : (
					<View style={[styles.darkRegion, StyleSheet.absoluteFill]} />
				)}

				<View
					style={[
						styles.tooltip,
						{ backgroundColor: theme.surface, borderColor: theme.border },
						targetRect
							? step.tooltipPosition === 'bottom'
								? { top: targetRect.y + targetRect.height + 16 }
								: { top: targetRect.y - 35, transform: [{ translateY: -180 }] }
							: { top: SCREEN_H / 2 - 90 },
					]}>
					<View style={styles.tooltipHeader}>
						<Text style={[styles.stepCounter, { color: theme.icon }]}>
							{currentIndex + 1} / {activeSteps.length}
						</Text>
						<TouchableOpacity
							onPress={handleFinish}
							hitSlop={12}>
							<Text style={[styles.skipText, { color: theme.icon }]}>{t('common.skip')}</Text>
						</TouchableOpacity>
					</View>

					<Text style={[styles.tooltipTitle, { color: theme.text }]}>{t(step.titleKey)}</Text>
					<Text style={[styles.tooltipDescription, { color: theme.icon }]}>{t(step.descriptionKey)}</Text>

					<View style={styles.tooltipFooter}>
						{currentIndex > 0 ? (
							<TouchableOpacity
								style={[styles.backBtn, { borderColor: theme.border }]}
								onPress={() => {
									setTargetRect(null)
									setCurrentIndex(currentIndex - 1)
								}}
								activeOpacity={0.7}>
								<Ionicons
									name='arrow-back'
									size={16}
									color={theme.text}
								/>
								<Text style={[styles.backBtnText, { color: theme.text }]}>{t('common.back')}</Text>
							</TouchableOpacity>
						) : (
							<View />
						)}

						<TouchableOpacity
							style={[styles.nextBtn, { backgroundColor: theme.primary }]}
							onPress={handleNext}
							activeOpacity={0.8}>
							<Text style={styles.nextBtnText}>{isLast ? t('common.done') : t('common.next')}</Text>
							{!isLast ? (
								<Ionicons
									name='arrow-forward'
									size={16}
									color='#FFFFFF'
								/>
							) : null}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	darkRegion: {
		position: 'absolute',
		backgroundColor: 'rgba(0, 0, 0, 0.75)',
	},
	highlightBorder: {
		position: 'absolute',
		borderWidth: 2,
		borderRadius: HIGHLIGHT_RADIUS,
	},
	tooltip: {
		position: 'absolute',
		left: 24,
		right: 24,
		borderWidth: 1,
		borderRadius: 16,
		padding: 20,
	},
	tooltipHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	stepCounter: {
		fontSize: 13,
		fontWeight: '600',
	},
	skipText: {
		fontSize: 14,
		fontWeight: '500',
	},
	tooltipTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 8,
	},
	tooltipDescription: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 20,
	},
	tooltipFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	backBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	backBtnText: {
		fontSize: 14,
		fontWeight: '600',
	},
	nextBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderRadius: 10,
		paddingHorizontal: 20,
		paddingVertical: 10,
	},
	nextBtnText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},
})
