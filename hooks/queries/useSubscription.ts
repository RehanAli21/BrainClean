import { subscriptionService } from '@/services/api/subscriptions';
import { useUiStore } from '@/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

export const subscriptionQueryKey = ['subscription', 'status'] as const;

export function useSubscriptionStatusQuery() {
  const setIsPremium = useUiStore(s => s.setIsPremium);
  const setSubscriptionState = useUiStore(s => s.setSubscriptionState);
  const setSubscriptionExpiresAt = useUiStore(s => s.setSubscriptionExpiresAt);

  const query = useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: () => subscriptionService.getStatus(),
    retry: 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setIsPremium(query.data.hasAccess);
      setSubscriptionState(query.data.state);
      setSubscriptionExpiresAt(query.data.expiresAt);
    }
  }, [query.data, setIsPremium, setSubscriptionState, setSubscriptionExpiresAt]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        query.refetch();
      }
    });
    return () => sub.remove();
  }, [query.refetch]);

  return query;
}
