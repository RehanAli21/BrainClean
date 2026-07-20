import { useTheme } from '@/hooks/useTheme'
import { feedbackService } from '@/services/api/feedback'
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/types/feedback'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { z } from 'zod'

interface FeedbackModalProps {
  visible: boolean
  onClose: () => void
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const cooldownRef = useRef(false)

  const schema = useMemo(() => z.object({
    category: z.preprocess(val => val ?? '', z.enum(FEEDBACK_CATEGORIES, { message: t('feedback.categoryRequired') })),
    message: z.string().min(1, t('feedback.messageRequired')).max(2000, t('feedback.messageTooLong')),
    email: z.union([z.literal(''), z.string().email(t('validation.emailInvalid'))]),
  }), [t])

  const reset = () => {
    setCategory(null)
    setMessage('')
    setEmail('')
    setErrors({})
    setApiError('')
    setSubmitted(false)
    setDropdownOpen(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (cooldownRef.current || isLoading) return
    cooldownRef.current = true

    setErrors({})
    setApiError('')

    const result = schema.safeParse({ category, message, email })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      cooldownRef.current = false
      return
    }

    setIsLoading(true)
    try {
      await feedbackService.submit({
        category: result.data.category,
        message: result.data.message,
        ...(result.data.email ? { email: result.data.email } : {}),
      })
      setSubmitted(true)
    } catch (err: any) {
      const code = err.response?.data?.error
      if (code === 'RATE_LIMIT_EXCEEDED') {
        setApiError(t('common.rateLimited'))
      } else if (code === 'VALIDATION_ERROR') {
        setApiError(err.response?.data?.message || t('common.invalidInput'))
      } else if (!err.response) {
        setApiError(t('common.networkError'))
      } else {
        setApiError(err.response?.data?.message || t('common.somethingWentWrong'))
      }
    } finally {
      setIsLoading(false)
      setTimeout(() => { cooldownRef.current = false }, 1000)
    }
  }

  const categoryLabel = (cat: FeedbackCategory) => t(`feedback.categories.${cat}`)

  if (submitted) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={56} color={theme.success} />
              <Text style={[styles.successTitle, { color: theme.text }]}>{t('feedback.thankYou')}</Text>
              <Text style={[styles.successMessage, { color: theme.icon }]}>{t('feedback.submitted')}</Text>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                onPress={handleClose}
                activeOpacity={0.8}>
                <Text style={styles.submitBtnText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('feedback.title')}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: theme.icon }]}>{t('feedback.subtitle')}</Text>

            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {apiError ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
                  <Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
                </View>
              ) : null}

              <Text style={[styles.label, { color: theme.text }]}>{t('feedback.categoryLabel')}</Text>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: theme.background, borderColor: errors.category ? theme.accent : theme.border }]}
                onPress={() => setDropdownOpen(!dropdownOpen)}
                activeOpacity={0.7}>
                <Text style={[styles.dropdownText, { color: category ? theme.text : theme.icon }]}>
                  {category ? categoryLabel(category) : t('feedback.selectCategory')}
                </Text>
                <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.icon} />
              </TouchableOpacity>
              {errors.category ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.category}</Text> : null}

              {dropdownOpen ? (
                <View style={[styles.dropdownList, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.dropdownItem, cat === category && { backgroundColor: theme.primary + '22' }]}
                      onPress={() => { setCategory(cat); setDropdownOpen(false) }}
                      activeOpacity={0.7}>
                      <Text style={[styles.dropdownItemText, { color: cat === category ? theme.primary : theme.text }]}>
                        {categoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.label, { color: theme.text }]}>{t('feedback.messageLabel')}</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: theme.background, borderColor: errors.message ? theme.accent : theme.border, color: theme.text },
                ]}
                placeholder={t('feedback.messagePlaceholder')}
                placeholderTextColor={theme.icon}
                multiline
                maxLength={2000}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
              {errors.message ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.message}</Text> : null}
              <Text style={[styles.charCount, { color: theme.icon }]}>{message.length}/2000</Text>

              <Text style={[styles.label, { color: theme.text }]}>{t('feedback.emailLabel')}</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.background, borderColor: errors.email ? theme.accent : theme.border, color: theme.text },
                ]}
                placeholder={t('feedback.emailPlaceholder')}
                placeholderTextColor={theme.icon}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {errors.email ? <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.email}</Text> : null}
              <View style={{ height: 12 }} />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }, isLoading && styles.disabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{t('feedback.submit')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  scrollBody: {
    flexGrow: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  dropdownText: {
    fontSize: 15,
    flex: 1,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
})
