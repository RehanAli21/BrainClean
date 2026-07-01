import { Colors } from '@/constants/theme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getRef, setWalkthroughActive } from './walkthroughRegistry'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const HIGHLIGHT_PADDING = 8
const HIGHLIGHT_RADIUS = 12

interface WalkthroughStep {
	key: string
	route: string
	title: string
	description: string
	tooltipPosition: 'top' | 'bottom'
}

const STEPS: WalkthroughStep[] = [
	{
		key: 'tasks-fab',
		route: '/(main)/(tabs)/tasks',
		title: 'Create a Task',
		description: 'Tap the + button to create a new focus task.',
		tooltipPosition: 'top',
	},
	{
		key: 'tasks-date',
		route: '/(main)/(tabs)/tasks',
		title: 'Filter by Date',
		description: 'Use the calendar to browse tasks from different days.',
		tooltipPosition: 'bottom',
	},
	{
		key: 'newtask-name',
		route: '/(main)/(tabs)/tasks/new',
		title: 'Task Name',
		description: 'Enter a name for your task — what you want to accomplish during this focus session.',
		tooltipPosition: 'bottom',
	},
	{
		key: 'newtask-duration',
		route: '/(main)/(tabs)/tasks/new',
		title: 'Duration',
		description: 'Set how long your focus session will last. Apps will be blocked for this entire duration.',
		tooltipPosition: 'bottom',
	},
	{
		key: 'newtask-create',
		route: '/(main)/(tabs)/tasks/new',
		title: 'Create Task',
		description: 'Tap here to create the task. You\'ll see the task detail page where you can start it.',
		tooltipPosition: 'top',
	},
	{
		key: 'apps-search',
		route: '/(main)/(tabs)/apps',
		title: 'Find & Select Apps',
		description: 'Search for apps and toggle them on. Selected apps will be blocked when you start a task.',
		tooltipPosition: 'bottom',
	},
	{
		key: 'settings-notifications',
		route: '/(main)/(tabs)/settings',
		title: 'Block Notifications',
		description: 'Enable this to silence notifications from blocked apps during your focus sessions.',
		tooltipPosition: 'bottom',
	},
	{
		key: 'settings-permissions',
		route: '/(main)/(tabs)/settings',
		title: 'Grant Permissions',
		description: "All permissions must be granted for blocking to work. Check them here if something isn't working.",
		tooltipPosition: 'top',
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
	const theme = Colors.dark
	const router = useRouter()
	const setTutorialSeen = useUiStore(s => s.setTutorialSeen)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
	const measureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	const step = STEPS[currentIndex]

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
					height: h + HIGHLIGHT_PADDING * 2,
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
		if (currentIndex < STEPS.length - 1) {
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
		router.navigate('/(main)/(tabs)/tasks' as any)
		onClose()
	}

	if (!visible || !step) return null

	const isLast = currentIndex === STEPS.length - 1

	return (
		<Modal
			visible
			transparent
			animationType='fade'
			statusBarTranslucent>
			<View style={styles.container}>
				{targetRect ? (
					<>
						{/* Top dark region */}
						<View style={[styles.darkRegion, { top: 0, left: 0, right: 0, height: targetRect.y }]} />
						{/* Bottom dark region */}
						<View style={[styles.darkRegion, { top: targetRect.y + targetRect.height, left: 0, right: 0, bottom: 0 }]} />
						{/* Left dark region */}
						<View style={[styles.darkRegion, { top: targetRect.y, left: 0, width: targetRect.x, height: targetRect.height }]} />
						{/* Right dark region */}
						<View
							style={[
								styles.darkRegion,
								{ top: targetRect.y, left: targetRect.x + targetRect.width, right: 0, height: targetRect.height },
							]}
						/>

						{/* Highlight border */}
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

				{/* Tooltip */}
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
							{currentIndex + 1} / {STEPS.length}
						</Text>
						<TouchableOpacity
							onPress={handleFinish}
							hitSlop={12}>
							<Text style={[styles.skipText, { color: theme.icon }]}>Skip</Text>
						</TouchableOpacity>
					</View>

					<Text style={[styles.tooltipTitle, { color: theme.text }]}>{step.title}</Text>
					<Text style={[styles.tooltipDescription, { color: theme.icon }]}>{step.description}</Text>

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
								<Text style={[styles.backBtnText, { color: theme.text }]}>Back</Text>
							</TouchableOpacity>
						) : (
							<View />
						)}

						<TouchableOpacity
							style={[styles.nextBtn, { backgroundColor: theme.primary }]}
							onPress={handleNext}
							activeOpacity={0.8}>
							<Text style={styles.nextBtnText}>{isLast ? 'Done' : 'Next'}</Text>
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
