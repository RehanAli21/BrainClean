import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useUiStore } from '@/store/uiStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  isNotificationListenerEnabled,
  requestAccessibilityPermission,
  requestNotificationListenerPermission,
  requestOverlayPermission,
  requestUsageStatsPermission,
} from '@/modules/blocker';

export default function SettingsScreen() {
  const theme = Colors.dark;
  const { email, logout } = useAuth();
  const { permissions, recheck } = usePermissions();
  const maxBlockTimeMinutes = useUiStore((s) => s.maxBlockTimeMinutes);
  const setMaxBlockTime = useUiStore((s) => s.setMaxBlockTime);
  const blockNotifications = useUiStore((s) => s.blockNotifications);
  const setBlockNotifications = useUiStore((s) => s.setBlockNotifications);
  const [timeInput, setTimeInput] = useState(String(maxBlockTimeMinutes));
  const [saved, setSaved] = useState(false);
  const pendingNotificationToggle = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pendingNotificationToggle.current) {
        pendingNotificationToggle.current = false;
        if (isNotificationListenerEnabled()) {
          setBlockNotifications(true);
        }
      }
    });
    return () => sub.remove();
  }, [setBlockNotifications]);

  const handleSaveMaxTime = () => {
    const value = parseInt(timeInput, 10);
    if (isNaN(value) || value < 1) {
      Alert.alert('Invalid Value', 'Minimum block time is 1 minute.');
      return;
    }
    if (value > 1440) {
      Alert.alert('Invalid Value', 'Maximum block time is 1440 minutes (24 hours).');
      return;
    }
    setMaxBlockTime(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggleNotifications = (value: boolean) => {
    if (value) {
      const enabled = isNotificationListenerEnabled();
      if (!enabled) {
        Alert.alert(
          'Permission Required',
          'BrainClean needs notification access to block notifications from selected apps during sessions. You will be taken to Settings to grant this permission.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                pendingNotificationToggle.current = true;
                requestNotificationListenerPermission();
              },
            },
          ],
        );
        return;
      }
    }
    setBlockNotifications(value);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>PROFILE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color={theme.icon} />
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: theme.icon }]}>Email</Text>
              <Text style={[styles.value, { color: theme.text }]}>{email ?? 'Not available'}</Text>
            </View>
          </View>
        </View>

        {/* Blocking Settings Section */}
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>BLOCKING</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="timer-outline" size={20} color={theme.icon} />
              <View style={styles.rowText}>
                <Text style={[styles.label, { color: theme.icon }]}>Max Block Time</Text>
                <Text style={[styles.hint, { color: theme.icon }]}>
                  Auto-unblock after this duration (1–1440 min)
                </Text>
              </View>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                ]}
                value={timeInput}
                onChangeText={setTimeInput}
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={[styles.unit, { color: theme.icon }]}>min</Text>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: saved ? theme.success : theme.primary }]}
                onPress={handleSaveMaxTime}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>{saved ? 'Saved' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notification Blocking */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="notifications-off-outline" size={20} color={theme.icon} />
              <View style={styles.rowText}>
                <Text style={[styles.label, { color: theme.icon }]}>Block Notifications</Text>
                <Text style={[styles.hint, { color: theme.icon }]}>
                  Silence notifications from blocked apps during sessions
                </Text>
              </View>
            </View>
            <Switch
              value={blockNotifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.text}
            />
          </View>
        </View>

        {/* Permissions Section */}
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>PERMISSIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <PermissionRow
            icon="stats-chart-outline"
            title="Usage Access"
            description="Detect which app is in the foreground"
            granted={permissions?.usageStats ?? false}
            onRequest={() => { requestUsageStatsPermission(); }}
          />
          <View style={[styles.permDivider, { backgroundColor: theme.border }]} />
          <PermissionRow
            icon="layers-outline"
            title="Display Over Other Apps"
            description="Show blocking overlay on blocked apps"
            granted={permissions?.overlay ?? false}
            onRequest={() => { requestOverlayPermission(); }}
          />
          <View style={[styles.permDivider, { backgroundColor: theme.border }]} />
          <PermissionRow
            icon="accessibility-outline"
            title="Accessibility Service"
            description="Instantly detect app switches from recents"
            granted={permissions?.accessibility ?? false}
            onRequest={() => { requestAccessibilityPermission(); }}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.accent }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.accent} />
          <Text style={[styles.logoutText, { color: theme.accent }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PermissionRow({
  icon,
  title,
  description,
  granted,
  onRequest,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  granted: boolean;
  onRequest: () => void;
}) {
  const theme = Colors.dark;

  return (
    <View style={styles.permRow}>
      <View style={styles.permInfo}>
        <Ionicons name={icon} size={20} color={theme.icon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.permTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.hint, { color: theme.icon }]}>{description}</Text>
        </View>
      </View>
      {granted ? (
        <View style={[styles.permBadge, { backgroundColor: theme.success + '1A' }]}>
          <Ionicons name="checkmark-circle" size={14} color={theme.success} />
          <Text style={[styles.permBadgeText, { color: theme.success }]}>Granted</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.permButton, { backgroundColor: theme.primary }]}
          onPress={onRequest}
          activeOpacity={0.7}
        >
          <Text style={styles.permButtonText}>Grant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  label: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  value: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 2 },
  settingRow: { gap: 12 },
  settingInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 32 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  unit: { fontSize: 14, fontWeight: '500' },
  saveButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
  permRow: { gap: 8 },
  permInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  permTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  permDivider: { height: 1, marginVertical: 12 },
  permBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 32,
  },
  permBadgeText: { fontSize: 12, fontWeight: '600' },
  permButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 32,
  },
  permButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
