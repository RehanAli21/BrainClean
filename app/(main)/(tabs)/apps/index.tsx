import { Colors } from '@/constants/theme';
import { getInstalledApps } from '@/modules/blocker';
import type { AppInfo } from '@/types/blocker';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AppsScreen() {
  const theme = Colors.dark;
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setIsLoading(true);
    setError('');
    try {
      const installedApps: AppInfo[] = getInstalledApps();
      setApps(installedApps);
    } catch {
      setError('Failed to load installed apps. Make sure you are running on a device.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const query = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.appName.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query),
    );
  }, [apps, search]);

  const renderItem = useCallback(
    ({ item }: { item: AppInfo }) => (
      <View style={[styles.appRow, { borderBottomColor: theme.border }]}>
        {item.icon ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.icon}` }}
            style={styles.appIcon}
          />
        ) : (
          <View style={[styles.appIconPlaceholder, { backgroundColor: theme.surface }]}>
            <Ionicons name="cube-outline" size={20} color={theme.icon} />
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>
            {item.appName}
          </Text>
          <Text style={[styles.packageName, { color: theme.icon }]} numberOfLines={1}>
            {item.packageName}
          </Text>
        </View>
      </View>
    ),
    [theme],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Apps</Text>
        {!isLoading && apps.length > 0 ? (
          <Text style={[styles.count, { color: theme.icon }]}>{apps.length} installed</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.icon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search apps..."
          placeholderTextColor={theme.icon}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Ionicons
            name="close-circle"
            size={18}
            color={theme.icon}
            onPress={() => setSearch('')}
          />
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.icon }]}>Loading apps...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.accent} />
          <Text style={[styles.errorText, { color: theme.icon }]}>{error}</Text>
        </View>
      ) : filteredApps.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={theme.border} />
          <Text style={[styles.emptyText, { color: theme.icon }]}>
            {search ? 'No apps match your search.' : 'No apps found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.packageName}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    paddingTop: 16,
  },
  title: { fontSize: 32, fontWeight: '700' },
  count: { fontSize: 14 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, marginTop: 4 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  list: { paddingBottom: 24 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  appIcon: { width: 40, height: 40, borderRadius: 8 },
  appIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  packageName: { fontSize: 12 },
});
