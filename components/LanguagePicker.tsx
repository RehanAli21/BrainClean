import { SUPPORTED_LANGUAGES } from '@/i18n'
import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
	visible: boolean
	onClose: () => void
	dismissable?: boolean
}

export function LanguagePicker({ visible, onClose, dismissable = true }: Props) {
	const theme = useTheme()
	const { t, i18n } = useTranslation()
	const setSelectedLanguage = useUiStore(s => s.setSelectedLanguage)
	const currentLanguage = i18n.language

	const handleSelect = (code: string) => {
		i18n.changeLanguage(code)
		setSelectedLanguage(code)
		onClose()
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType='slide'
			statusBarTranslucent
			onRequestClose={dismissable ? onClose : undefined}>
			<View style={styles.backdrop}>
				<View style={[styles.sheet, { backgroundColor: theme.background }]}>
					<View style={styles.header}>
						<View style={styles.headerText}>
							<Text style={[styles.title, { color: theme.text }]}>{t('languageSelector.title')}</Text>
							<Text style={[styles.subtitle, { color: theme.icon }]}>{t('languageSelector.subtitle')}</Text>
						</View>
						{dismissable ? (
							<TouchableOpacity onPress={onClose} hitSlop={12}>
								<Ionicons name='close' size={24} color={theme.icon} />
							</TouchableOpacity>
						) : null}
					</View>

					<FlatList
						data={SUPPORTED_LANGUAGES}
						keyExtractor={item => item.code}
						renderItem={({ item }) => {
							const isSelected = currentLanguage === item.code
							return (
								<TouchableOpacity
									style={[
										styles.langRow,
										{ borderBottomColor: theme.border },
										isSelected && { backgroundColor: theme.primary + '1A' },
									]}
									onPress={() => handleSelect(item.code)}
									activeOpacity={0.7}>
									<Text style={[styles.langName, { color: theme.text }]}>{item.nativeName}</Text>
									{isSelected ? (
										<Ionicons name='checkmark-circle' size={22} color={theme.primary} />
									) : null}
								</TouchableOpacity>
							)
						}}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.list}
					/>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		justifyContent: 'flex-end',
	},
	sheet: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '80%',
		paddingBottom: 32,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		padding: 24,
		paddingBottom: 16,
	},
	headerText: {
		flex: 1,
		marginRight: 16,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
	},
	list: {
		paddingHorizontal: 16,
	},
	langRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderRadius: 8,
		marginBottom: 2,
	},
	langName: {
		fontSize: 16,
		fontWeight: '500',
	},
})
