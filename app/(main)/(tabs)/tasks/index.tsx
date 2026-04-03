import { TASK_POLL_INTERVAL_MS } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTasksQuery } from '@/hooks/queries/useTasks';
import { useBlocker } from '@/hooks/useBlocker';
import type { Task } from '@/types/task';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function getTaskStatus(task: Task) {
  if (task.completed) return { icon: 'checkmark-circle' as const, color: '#10B981', label: 'Completed' };
  if (task.started) return { icon: 'radio-button-on' as const, color: '#2563EB', label: 'Active' };
  return { icon: 'ellipse-outline' as const, color: '#A1A1AA', label: 'Pending' };
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const theme = Colors.dark;
  const status = getTaskStatus(task);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardText}>
          <Text
            style={[
              styles.taskName,
              { color: theme.text },
              task.completed && styles.taskNameCompleted,
            ]}
            numberOfLines={1}
          >
            {task.name}
          </Text>
          <Text style={[styles.taskDuration, { color: theme.icon }]}>
            {formatDuration(task.minimumDurationSeconds)}
          </Text>
        </View>
        <Ionicons name={status.icon} size={24} color={status.color} />
      </View>
    </TouchableOpacity>
  );
}

export default function TaskListScreen() {
  const theme = Colors.dark;
  const router = useRouter();
  const { logout } = useAuth();
  const { data: tasks, isLoading, isError, refetch } = useTasksQuery();
  const { isBlocking, stopBlocking } = useBlocker();
  const hasActiveTask = tasks?.some((t) => t.started && !t.completed) ?? false;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Stop native blocking when no task is active (task completed from website)
  useEffect(() => {
    if (tasks && !hasActiveTask && isBlocking) {
      stopBlocking();
    }
  }, [tasks, hasActiveTask, isBlocking, stopBlocking]);

  // Poll for task completion while blocking is active
  useEffect(() => {
    if (!isBlocking) return;
    const interval = setInterval(refetch, TASK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isBlocking, refetch]);

  const renderItem = ({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      onPress={() => router.push(`/(main)/(tabs)/tasks/${item.id}`)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Tasks</Text>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color={theme.icon} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.icon }]}>
            Failed to load tasks.
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !tasks || tasks.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="clipboard-outline" size={48} color={theme.border} />
          <Text style={[styles.emptyText, { color: theme.icon, marginTop: 12 }]}>
            No tasks yet.{'\n'}Create your first task!
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {hasActiveTask ? null : (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(main)/(tabs)/tasks/new')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  title: { fontSize: 32, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  list: { paddingBottom: 80 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: { flex: 1, marginRight: 12 },
  taskName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  taskNameCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  taskDuration: { fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
