import { AuthInput } from '@/components/AuthInput'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useTheme } from '@/hooks/useTheme'
import { authService } from '@/services/api/auth'
import { Ionicons } from '@expo/vector-icons'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { z } from 'zod'

export default function ResetPasswordScreen() {
	const theme = useTheme()
	const { t } = useTranslation()
	const router = useRouter()
	const { email } = useLocalSearchParams<{ email: string }>()
	const [code, setCode] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [apiError, setApiError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [success, setSuccess] = useState(false)

	const resetSchema = useMemo(() => z
		.object({
			code: z.string().length(6, t('validation.codeLength')).regex(/^\d{6}$/, t('validation.codeDigits')),
			newPassword: z.string().min(8, t('validation.passwordMin')).max(128, t('validation.passwordMax')),
			confirmPassword: z.string(),
		})
		.refine(data => data.newPassword === data.confirmPassword, {
			message: t('validation.passwordsMismatch'),
			path: ['confirmPassword'],
		}), [t])

	const handleReset = async () => {
		setErrors({})
		setApiError('')

		const result = resetSchema.safeParse({ code, newPassword, confirmPassword })
		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			for (const issue of result.error.issues) {
				const key = issue.path[0] as string
				if (!fieldErrors[key]) fieldErrors[key] = issue.message
			}
			setErrors(fieldErrors)
			return
		}

		if (!email) {
			setApiError(t('auth.resetPassword.emailMissing'))
			return
		}

		setIsLoading(true)
		try {
			await authService.resetPassword(email, code, newPassword, confirmPassword)
			setSuccess(true)
		} catch (err: any) {
			const code = err.response?.data?.error
			if (code === 'INVALID_TOKEN') {
				setApiError(t('auth.resetPassword.invalidCode'))
			} else if (code === 'TOKEN_EXPIRED') {
				setApiError(t('auth.resetPassword.codeExpired'))
			} else if (code === 'PASSWORD_MISMATCH') {
				setApiError(t('auth.resetPassword.passwordMismatch'))
			} else if (code === 'VALIDATION_ERROR') {
				setApiError(err.response?.data?.message || t('common.invalidInput'))
			} else if (code === 'RATE_LIMIT_EXCEEDED') {
				setApiError(t('common.rateLimited'))
			} else if (!err.response) {
				setApiError(t('common.networkError'))
			} else {
				setApiError(err.response?.data?.message || t('common.somethingWentWrong'))
			}
		} finally {
			setIsLoading(false)
		}
	}

	if (success) {
		return (
			<View style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={styles.successContent}>
					<Ionicons
						name='checkmark-circle'
						size={64}
						color='#10B981'
					/>
					<Text style={[styles.title, { color: theme.text, marginTop: 16 }]}>{t('auth.resetPassword.successTitle')}</Text>
					<Text style={[styles.subtitle, { color: theme.icon, textAlign: 'center' }]}>
						{t('auth.resetPassword.successMessage')}
					</Text>
					<View style={{ width: '100%', marginTop: 24 }}>
						<PrimaryButton
							title={t('auth.resetPassword.backToLogin')}
							onPress={() => router.replace('/auth/login')}
						/>
					</View>
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<Link
				href='/auth/forgot-password'
				asChild>
				<TouchableOpacity style={styles.backButton}>
					<Ionicons
						name='arrow-back'
						size={24}
						color={theme.text}
						style={{ marginRight: 8 }}
					/>
					<Text style={[styles.backText, { color: theme.text }]}>{t('common.back')}</Text>
				</TouchableOpacity>
			</Link>

			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.text }]}>{t('auth.resetPassword.title')}</Text>
				<Text style={[styles.subtitle, { color: theme.icon }]}>
					{t('auth.resetPassword.subtitle', { email: email || t('auth.resetPassword.yourEmail') })}
				</Text>
			</View>

			<View style={styles.form}>
				{apiError ? (
					<View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
						<Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
					</View>
				) : null}

				<AuthInput
					label={t('auth.resetPassword.codeLabel')}
					placeholder={t('auth.resetPassword.codePlaceholder')}
					keyboardType='number-pad'
					autoCapitalize='none'
					value={code}
					onChangeText={setCode}
					maxLength={6}
				/>
				{errors.code ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.code}</Text> : null}

				<AuthInput
					label={t('auth.resetPassword.newPasswordLabel')}
					placeholder='••••••••'
					isPassword
					value={newPassword}
					onChangeText={setNewPassword}
				/>
				{errors.newPassword ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.newPassword}</Text> : null}

				<AuthInput
					label={t('auth.signup.confirmPasswordLabel')}
					placeholder='••••••••'
					isPassword
					value={confirmPassword}
					onChangeText={setConfirmPassword}
				/>
				{errors.confirmPassword ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.confirmPassword}</Text> : null}

				<PrimaryButton
					title={t('auth.resetPassword.resetButton')}
					onPress={handleReset}
					isLoading={isLoading}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24, justifyContent: 'center' },
	backButton: {
		position: 'absolute',
		top: 60,
		left: 24,
		zIndex: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	backText: { fontSize: 16, fontWeight: '600' },
	header: { marginBottom: 32, marginTop: 40 },
	title: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
	subtitle: { fontSize: 16 },
	form: { width: '100%' },
	successContent: { alignItems: 'center', paddingHorizontal: 16 },
	errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
	errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
	fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
})
