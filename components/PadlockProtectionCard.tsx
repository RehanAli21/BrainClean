import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export function PadlockProtectionCard({ manufacturer }: { manufacturer: string }) {
	const theme = useTheme()
	const { t } = useTranslation()
	const padlockConfirmedAt = useUiStore(s => s.padlockConfirmedAt)
	const setPadlockConfirmed = useUiStore(s => s.setPadlockConfirmed)
	const brandLabel = manufacturer ? manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1) : 'Your phone'

	if (padlockConfirmedAt != null) {
		return (
			<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.success }]}>
				<View style={styles.cardHeader}>
					<Ionicons name='shield-checkmark' size={24} color={theme.success} />
					<Text style={[styles.cardTitle, { color: theme.text }]}>{t('padlock.lockedTitle')}</Text>
				</View>
				<Text style={[styles.cardDescription, { color: theme.icon }]}>
					{t('padlock.lockedDesc')}
				</Text>
				<TouchableOpacity
					style={styles.linkButton}
					onPress={() => setPadlockConfirmed(false)}
					activeOpacity={0.7}>
					<Text style={[styles.linkButtonText, { color: theme.icon }]}>{t('padlock.showInstructions')}</Text>
				</TouchableOpacity>
			</View>
		)
	}

	return (
		<View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
			<View style={styles.cardHeader}>
				<Ionicons name='warning' size={24} color={theme.accent} />
				<Text style={[styles.cardTitle, { color: theme.text }]}>{t('padlock.lockTitle')}</Text>
			</View>
			<Text style={[styles.cardDescription, { color: theme.icon }]}>
				{t('padlock.lockDesc', { brand: brandLabel })}{' '}
				<Text style={{ color: theme.text, fontWeight: '600' }}>{t('padlock.lock')}</Text>. {t('padlock.oneTime')}
			</Text>

			<GestureIllustration />

			<TouchableOpacity
				style={[styles.primaryButton, { backgroundColor: theme.accent }]}
				onPress={() => setPadlockConfirmed(true)}
				activeOpacity={0.7}>
				<Text style={styles.primaryButtonText}>{t('padlock.confirmed')}</Text>
			</TouchableOpacity>
		</View>
	)
}

function GestureIllustration() {
	const theme = useTheme()
	const { t } = useTranslation()
	return (
		<View style={styles.illustration}>
			<Step n={1} icon='apps' label={t('padlock.step1')} />
			<Ionicons name='chevron-forward' size={16} color={theme.icon} />
			<Step n={2} icon='ellipsis-vertical' label={t('padlock.step2')} />
			<Ionicons name='chevron-forward' size={16} color={theme.icon} />
			<Step n={3} icon='lock-closed' label={t('padlock.step3')} />
		</View>
	)
}

function Step({ n, icon, label }: { n: number; icon: keyof typeof Ionicons.glyphMap; label: string }) {
	const theme = useTheme()
	return (
		<View style={styles.step}>
			<View style={[styles.stepCircle, { backgroundColor: theme.background, borderColor: theme.border }]}>
				<Ionicons name={icon} size={20} color={theme.primary} />
				<View style={[styles.stepNum, { backgroundColor: theme.primary }]}>
					<Text style={styles.stepNumText}>{n}</Text>
				</View>
			</View>
			<Text style={[styles.stepLabel, { color: theme.icon }]}>{label}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
	},
	cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
	cardTitle: { fontSize: 17, fontWeight: '600' },
	cardDescription: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
	illustration: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: 16,
		gap: 4,
	},
	step: { flex: 1, alignItems: 'center', gap: 6 },
	stepCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
	},
	stepNum: {
		position: 'absolute',
		top: -4,
		right: -4,
		width: 18,
		height: 18,
		borderRadius: 9,
		justifyContent: 'center',
		alignItems: 'center',
	},
	stepNumText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
	stepLabel: { fontSize: 11, textAlign: 'center', lineHeight: 14 },
	primaryButton: {
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
	linkButton: { alignItems: 'center', paddingVertical: 8 },
	linkButtonText: { fontSize: 13, fontWeight: '500' },
})
