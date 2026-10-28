import { useTheme } from '@/hooks/useTheme'
import { isNotificationListenerEnabled, requestNotificationListenerPermission } from '@/modules/blocker'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { forwardRef, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Reusable 3-way notification-blocking selector shown on the task-creation
// screen. 0 = off, 1 = blocked apps only, 2 = all.
// Selecting a blocking mode (>0) requires the NotificationListener grant; if it
// isn't enabled we prompt for it and only apply the selection once the user
// returns with it granted — matching the previous Settings behavior.
export const NotificationModeSelector = forwardRef<View, {
	value: number
	onChange: (mode: number) => void
	disabled?: boolean
}>(function NotificationModeSelector({ value, onChange, disabled }, ref) {
	const theme = useTheme()
	const { t } = useTranslation()
	const pendingMode = useRef(0)
	const awaitingReturn = useRef(false)

	useEffect(() => {
		const sub = AppState.addEventListener('change', state => {
			if (state === 'active' && awaitingReturn.current) {
				awaitingReturn.current = false
				if (pendingMode.current > 0 && isNotificationListenerEnabled()) {
					onChange(pendingMode.current)
				}
				pendingMode.current = 0
			}
		})
		return () => sub.remove()
	}, [onChange])

	const handleSelect = (mode: number) => {
		if (mode > 0 && !isNotificationListenerEnabled()) {
			pendingMode.current = mode
			Alert.alert(
				t('settings.notifPermTitle'),
				t('settings.notifPermMessage'),
				[
					{ text: t('common.cancel'), style: 'cancel' },
					{
						text: t('settings.openSettings'),
						onPress: () => {
							awaitingReturn.current = true
							requestNotificationListenerPermission()
						},
					},
				],
			)
			return
		}
		onChange(mode)
	}

	const labels = [
		t('settings.notifModeOff'),
		t('settings.notifModeSelected'),
		t('settings.notifModeAll'),
	]

	return (
		<View ref={ref} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
			<View style={styles.header}>
				<Ionicons name='notifications-off-outline' size={20} color={theme.icon} />
				<View style={{ flex: 1 }}>
					<Text style={[styles.label, { color: theme.icon }]}>{t('settings.blockNotifications')}</Text>
					<Text style={[styles.hint, { color: theme.icon }]}>{t('settings.blockNotificationsHint')}</Text>
				</View>
			</View>
			<View style={styles.modes}>
				{([0, 1, 2] as const).map(mode => {
					const active = value === mode
					return (
						<TouchableOpacity
							key={mode}
							style={[
								styles.modeBtn,
								{
									backgroundColor: active ? theme.primary : 'transparent',
									borderColor: active ? theme.primary : theme.border,
								},
							]}
							onPress={() => handleSelect(mode)}
							activeOpacity={0.7}
							disabled={disabled}>
							<Text style={[styles.modeBtnText, { color: active ? '#FFFFFF' : theme.icon }]}>
								{labels[mode]}
							</Text>
						</TouchableOpacity>
					)
				})}
			</View>
		</View>
	)
})

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
	label: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
	hint: { fontSize: 12, marginTop: 2 },
	modes: { flexDirection: 'row', gap: 8 },
	modeBtn: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: 'center',
	},
	modeBtnText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
})
