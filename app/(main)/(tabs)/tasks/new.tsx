import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors } from '@/constants/theme';
import { useCreateTaskMutation } from '@/hooks/queries/useTasks';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

const createTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(255, 'Task name is too long'),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
});

export default function NewTaskScreen() {
  const theme = Colors.dark;
  const router = useRouter();
  const createMutation = useCreateTaskMutation();

  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const handleCreate = () => {
    setErrors({});
    setApiError('');

    const parsed = parseInt(durationMinutes, 10);
    const result = createTaskSchema.safeParse({
      name: name.trim(),
      durationMinutes: isNaN(parsed) ? 0 : parsed,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    createMutation.mutate(
      {
        name: result.data.name,
        minimumDurationSeconds: result.data.durationMinutes * 60,
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => {
          const code = err.response?.data?.error;
          if (code === 'VALIDATION_ERROR') {
            setApiError(err.response?.data?.message || 'Invalid input.');
          } else {
            setApiError('Something went wrong. Please try again.');
          }
        },
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>New Task</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        {apiError ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.accent + '1A' }]}>
            <Text style={[styles.errorBannerText, { color: theme.accent }]}>{apiError}</Text>
          </View>
        ) : null}

        <AuthInput
          label="Task Name"
          placeholder="e.g. Read 10 pages"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
        />
        {errors.name ? (
          <Text style={[styles.fieldError, { color: theme.accent }]}>{errors.name}</Text>
        ) : null}

        <AuthInput
          label="Duration (minutes)"
          placeholder="e.g. 10"
          value={durationMinutes}
          onChangeText={setDurationMinutes}
          keyboardType="numeric"
        />
        {errors.durationMinutes ? (
          <Text style={[styles.fieldError, { color: theme.accent }]}>
            {errors.durationMinutes}
          </Text>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <PrimaryButton
            title="Create Task"
            onPress={handleCreate}
            isLoading={createMutation.isPending}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingTop: 16,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  form: { width: '100%' },
  errorBanner: { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  fieldError: { fontSize: 12, marginTop: -12, marginBottom: 8, marginLeft: 4 },
});
