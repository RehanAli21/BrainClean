import { useTheme } from '@/hooks/useTheme'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TextInput, View } from 'react-native'

const MAX_LEN = 150

/**
 * A labelled multiline input for the per-feature custom block-screen message,
 * shown inline on the task and wellness feature UIs. Empty means the
 * overlay uses its built-in default.
 */
export function CustomMessageField({
	value,
	onChangeText,
	label,
}: {
	value: string
	onChangeText: (text: string) => void
	label?: string
}) {
	const theme = useTheme()
	const { t } = useTranslation()

	return (
		<View style={styles.wrap}>
			<Text style={[styles.label, { color: theme.icon }]}>{label ?? t('customMessages.label')}</Text>
			<TextInput
				style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
				placeholder={t('customMessages.placeholder')}
				placeholderTextColor={theme.icon + '80'}
				value={value}
				onChangeText={text => onChangeText(text.slice(0, MAX_LEN))}
				multiline
				maxLength={MAX_LEN}
				autoCapitalize='sentences'
			/>
			<Text style={[styles.hint, { color: theme.icon }]}>{t('customMessages.hint')}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { marginBottom: 4 },
	label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
	input: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 12,
		fontSize: 15,
		minHeight: 64,
		textAlignVertical: 'top',
	},
	hint: { fontSize: 12, marginTop: 6, marginLeft: 4 },
})
