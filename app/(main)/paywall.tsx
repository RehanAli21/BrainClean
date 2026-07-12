import { PrimaryButton } from '@/components/PrimaryButton';
import { Colors } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useUiStore } from '@/store/uiStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FEATURES = [
  { icon: 'shield-checkmark-outline' as const, key: 'blockApps' },
  { icon: 'time-outline' as const, key: 'autoComplete' },
  { icon: 'notifications-off-outline' as const, key: 'blockNotifs' },
  { icon: 'phone-portrait-outline' as const, key: 'reboot' },
] as const;

export default function PaywallScreen() {
  const theme = Colors.dark;
  const { t } = useTranslation();
  const router = useRouter();
  const {
    isPremium,
    isLoading,
    isPurchasing,
    connected,
    displayPrice,
    trialOffer,
    purchaseSubscription,
    restorePurchases,
  } = useSubscription();
  const subscriptionState = useUiStore(s => s.subscriptionState);
  const subscriptionExpiresAt = useUiStore(s => s.subscriptionExpiresAt);

  if (isPremium) {
    router.replace('/(main)/(tabs)/tasks/new');
    return null;
  }

  const getStateBanner = (): { text: string; color: string; icon: keyof typeof Ionicons.glyphMap } | null => {
    switch (subscriptionState) {
      case 'IN_GRACE_PERIOD':
        return { text: t('subscription.gracePeriod'), color: '#F59E0B', icon: 'warning-outline' };
      case 'CANCELED':
        if (subscriptionExpiresAt && new Date(subscriptionExpiresAt) > new Date()) {
          return { text: t('subscription.canceled', { date: new Date(subscriptionExpiresAt).toLocaleDateString() }), color: '#F59E0B', icon: 'time-outline' };
        }
        return null;
      case 'PENDING':
        return { text: t('subscription.pending'), color: theme.primary, icon: 'hourglass-outline' };
      default:
        return null;
    }
  };

  const stateBanner = getStateBanner();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '1A' }]}>
          <Ionicons name="diamond-outline" size={48} color={theme.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{t('paywall.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>{t('paywall.subtitle')}</Text>

        {stateBanner ? (
          <View style={[styles.stateBanner, { backgroundColor: stateBanner.color + '1A', borderColor: stateBanner.color }]}>
            <Ionicons name={stateBanner.icon} size={18} color={stateBanner.color} />
            <Text style={[styles.stateBannerText, { color: stateBanner.color }]}>{stateBanner.text}</Text>
          </View>
        ) : null}

        {trialOffer ? (
          <View style={[styles.trialBadge, { backgroundColor: theme.success + '1A', borderColor: theme.success }]}>
            <Ionicons name="gift-outline" size={18} color={theme.success} />
            <Text style={[styles.trialBadgeText, { color: theme.success }]}>{t('paywall.trialBadge')}</Text>
          </View>
        ) : null}

        <View style={[styles.featuresCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.featuresTitle, { color: theme.text }]}>{t('paywall.whatsIncluded')}</Text>
          {FEATURES.map((feature) => (
            <View key={feature.key} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.primary + '1A' }]}>
                <Ionicons name={feature.icon} size={20} color={theme.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureName, { color: theme.text }]}>{t(`paywall.features.${feature.key}`)}</Text>
                <Text style={[styles.featureDesc, { color: theme.icon }]}>{t(`paywall.features.${feature.key}Desc`)}</Text>
              </View>
            </View>
          ))}
        </View>

        {isLoading || !connected ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.purchaseSection}>
            <View style={[styles.priceCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <Text style={[styles.priceLabel, { color: theme.icon }]}>{t('paywall.monthly')}</Text>
              <Text style={[styles.price, { color: theme.text }]}>{displayPrice ?? '—'}</Text>
              <Text style={[styles.priceSubtext, { color: theme.icon }]}>{t('paywall.perMonth')}</Text>
            </View>

            <PrimaryButton
              title={trialOffer ? t('paywall.startTrial') : t('paywall.subscribe')}
              onPress={purchaseSubscription}
              isLoading={isPurchasing}
            />

            <TouchableOpacity onPress={restorePurchases} style={styles.restoreButton}>
              <Text style={[styles.restoreText, { color: theme.primary }]}>{t('paywall.restore')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 40,
  },
  backButton: { padding: 4 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  stateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  stateBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  trialBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { flex: 1 },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  purchaseSection: {
    width: '100%',
    alignItems: 'center',
  },
  priceCard: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 2,
  },
  priceSubtext: {
    fontSize: 13,
  },
  restoreButton: {
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
