import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, type ViewToken } from 'react-native'
import { triggerWalkthrough } from './walkthroughRegistry'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface TutorialStep {
	icon: keyof typeof Ionicons.glyphMap
	iconColor: string
	titleKey: string
	descriptionKey: string
}

const STEPS: TutorialStep[] = [
	{ icon: 'shield-checkmark', iconColor: '#2563EB', titleKey: 'tutorial.welcome', descriptionKey: 'tutorial.welcomeDesc' },
	{ icon: 'grid-outline', iconColor: '#06B6D4', titleKey: 'tutorial.selectApps', descriptionKey: 'tutorial.selectAppsDesc' },
	{ icon: 'add-circle-outline', iconColor: '#2563EB', titleKey: 'tutorial.createTask', descriptionKey: 'tutorial.createTaskDesc' },
	{ icon: 'play-circle-outline', iconColor: '#10B981', titleKey: 'tutorial.startTask', descriptionKey: 'tutorial.startTaskDesc' },
	{ icon: 'checkmark-circle', iconColor: '#10B981', titleKey: 'tutorial.completeTask', descriptionKey: 'tutorial.completeTaskDesc' },
	{ icon: 'notifications-off-outline', iconColor: '#F43F5E', titleKey: 'tutorial.notifModes', descriptionKey: 'tutorial.notifModesDesc' },
	{ icon: 'eye-outline', iconColor: '#06B6D4', titleKey: 'tutorial.eyeBlinker', descriptionKey: 'tutorial.eyeBlinkerDesc' },
	{ icon: 'hourglass-outline', iconColor: '#F43F5E', titleKey: 'tutorial.doomScroll', descriptionKey: 'tutorial.doomScrollDesc' },
	{ icon: 'chatbubble-ellipses-outline', iconColor: '#10B981', titleKey: 'tutorial.feedback', descriptionKey: 'tutorial.feedbackDesc' },
	{ icon: 'rocket-outline', iconColor: '#06B6D4', titleKey: 'tutorial.ready', descriptionKey: 'tutorial.readyDesc' },
]

interface Props {
	visible: boolean
	onClose: () => void
}

export function TutorialOverlay({ visible, onClose }: Props) {
	const theme = useTheme()
	const { t } = useTranslation()
	const setTutorialSeen = useUiStore(s => s.setTutorialSeen)
	const [currentIndex, setCurrentIndex] = useState(0)
	const flatListRef = useRef<FlatList>(null)

	const handleDone = () => {
		setTutorialSeen(true)
		setCurrentIndex(0)
		onClose()
	}

	const handleNext = () => {
		if (currentIndex < STEPS.length - 1) {
			flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
		} else {
			handleDone()
		}
	}

	const handleSkip = () => {
		handleDone()
	}

	const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
		if (viewableItems.length > 0 && viewableItems[0].index != null) {
			setCurrentIndex(viewableItems[0].index)
		}
	}).current

	const renderStep = ({ item }: { item: TutorialStep }) => (
		<View style={[styles.slide, { width: SCREEN_WIDTH }]}>
			<View style={[styles.iconCircle, { backgroundColor: item.iconColor + '1A' }]}>
				<Ionicons
					name={item.icon}
					size={56}
					color={item.iconColor}
				/>
			</View>
			<Text style={[styles.stepTitle, { color: theme.text }]}>{t(item.titleKey)}</Text>
			<Text style={[styles.stepDescription, { color: theme.icon }]}>{t(item.descriptionKey)}</Text>
		</View>
	)

	return (
		<Modal
			visible={visible}
			animationType='fade'
			transparent
			statusBarTranslucent>
			<View style={[styles.overlay, { backgroundColor: theme.background }]}>
				<View style={styles.topBar}>
					<TouchableOpacity
						onPress={handleSkip}
						style={styles.skipButton}>
						<Text style={[styles.skipText, { color: theme.icon }]}>{t('common.skip')}</Text>
					</TouchableOpacity>
				</View>

				<FlatList
					ref={flatListRef}
					data={STEPS}
					renderItem={renderStep}
					keyExtractor={(_, i) => String(i)}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					onViewableItemsChanged={onViewableItemsChanged}
					viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
					bounces={false}
				/>

				<View style={styles.footer}>
					<View style={styles.dots}>
						{STEPS.map((_, i) => (
							<View
								key={i}
								style={[
									styles.dot,
									{
										backgroundColor: i === currentIndex ? theme.primary : theme.border,
										width: i === currentIndex ? 24 : 8,
									},
								]}
							/>
						))}
					</View>

					{currentIndex === STEPS.length - 1 ? (
						<View style={styles.lastScreenButtons}>
							<TouchableOpacity
								style={[styles.nextButton, { backgroundColor: theme.primary }]}
								onPress={() => {
									handleDone()
									setTimeout(triggerWalkthrough, 400)
								}}
								activeOpacity={0.8}>
								<Ionicons
									name='finger-print-outline'
									size={18}
									color='#FFFFFF'
								/>
								<Text style={styles.nextButtonText}>{t('tutorial.interactive')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.skipOutlineButton, { borderColor: theme.border }]}
								onPress={handleDone}
								activeOpacity={0.7}>
								<Text style={[styles.skipOutlineText, { color: theme.icon }]}>{t('common.skip')}</Text>
							</TouchableOpacity>
						</View>
					) : (
						<TouchableOpacity
							style={[styles.nextButton, { backgroundColor: theme.primary }]}
							onPress={handleNext}
							activeOpacity={0.8}>
							<Text style={styles.nextButtonText}>{t('common.next')}</Text>
							<Ionicons
								name='arrow-forward'
								size={18}
								color='#FFFFFF'
							/>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
	},
	topBar: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingHorizontal: 24,
		paddingTop: 52,
	},
	skipButton: {
		padding: 8,
	},
	skipText: {
		fontSize: 15,
		fontWeight: '500',
	},
	slide: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	iconCircle: {
		width: 120,
		height: 120,
		borderRadius: 60,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 32,
	},
	stepTitle: {
		fontSize: 26,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 16,
	},
	stepDescription: {
		fontSize: 16,
		lineHeight: 24,
		textAlign: 'center',
	},
	footer: {
		paddingHorizontal: 24,
		paddingBottom: 48,
		gap: 24,
	},
	dots: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 6,
	},
	dot: {
		height: 8,
		borderRadius: 4,
	},
	nextButton: {
		height: 52,
		borderRadius: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
	},
	nextButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	lastScreenButtons: {
		gap: 12,
	},
	skipOutlineButton: {
		height: 52,
		borderRadius: 12,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	skipOutlineText: {
		fontSize: 16,
		fontWeight: '600',
	},
})
