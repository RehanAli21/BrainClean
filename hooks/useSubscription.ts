import { SUBSCRIPTION_SKU } from '@/constants/config';
import { subscriptionQueryKey, useSubscriptionStatusQuery } from '@/hooks/queries/useSubscription';
import { analytics } from '@/services/analytics';
import { subscriptionService } from '@/services/api/subscriptions';
import { useUiStore } from '@/store/uiStore';
import { ErrorCode, useIAP } from 'expo-iap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

export function useSubscription() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const isPremium = useUiStore(s => s.isPremium);
  const setIsPremium = useUiStore(s => s.setIsPremium);
  const setSubscriptionState = useUiStore(s => s.setSubscriptionState);
  const setSubscriptionExpiresAt = useUiStore(s => s.setSubscriptionExpiresAt);
  const queryClient = useQueryClient();
  const fetchedProducts = useRef(false);

  const { isLoading: statusLoading, isError: statusError } = useSubscriptionStatusQuery();

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        const response = await subscriptionService.verify({
          purchaseToken: purchase.purchaseToken ?? '',
          productId: purchase.productId,
        });
        await finishTransaction({ purchase, isConsumable: false });
        setIsPremium(response.hasAccess);
        setSubscriptionState(response.state);
        setSubscriptionExpiresAt(response.expiresAt);
        analytics.track('subscription_purchased', { productId: purchase.productId });
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
      } catch {
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert(
          'Purchase Issue',
          "Your purchase couldn't be verified right now. It may take a moment to activate. If the issue persists, please contact support.",
        );
        setTimeout(() => {
          refreshStatus();
        }, 5000);
      }
      setIsPurchasing(false);
    },
    onPurchaseError: (error) => {
      setIsPurchasing(false);
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Purchase Failed', error.message);
      }
    },
  });

  const refreshStatus = useCallback(async () => {
    try {
      const fresh = await subscriptionService.getStatus();
      setIsPremium(fresh.hasAccess);
      setSubscriptionState(fresh.state);
      setSubscriptionExpiresAt(fresh.expiresAt);
      queryClient.setQueryData(subscriptionQueryKey, fresh);
    } catch {}
  }, [setIsPremium, setSubscriptionState, setSubscriptionExpiresAt, queryClient]);

  useEffect(() => {
    if (connected && !fetchedProducts.current) {
      fetchedProducts.current = true;
      fetchProducts({ skus: [SUBSCRIPTION_SKU], type: 'subs' });
    }
  }, [connected, fetchProducts]);

  const purchaseSubscription = useCallback(async () => {
    if (!subscriptions.length) return;
    setIsPurchasing(true);

    const sub = subscriptions.find(s => s.id === SUBSCRIPTION_SKU);
    if (!sub) {
      setIsPurchasing(false);
      return;
    }

    const androidOffers = sub.subscriptionOffers
      ?.filter(o => o.offerTokenAndroid)
      .map(o => ({
        sku: sub.id,
        offerToken: o.offerTokenAndroid!,
      })) ?? [];

    try {
      await requestPurchase({
        request: {
          google: {
            skus: [sub.id],
            ...(androidOffers.length > 0 && { subscriptionOffers: androidOffers }),
          },
        },
        type: 'subs',
      });
    } catch {
      setIsPurchasing(false);
    }
  }, [subscriptions, requestPurchase]);

  const handleRestore = useCallback(async () => {
    try {
      await restorePurchases();
      await refreshStatus();
    } catch {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    }
  }, [restorePurchases, refreshStatus]);

  const subscription = subscriptions.find(s => s.id === SUBSCRIPTION_SKU);

  const trialOffer = subscription?.subscriptionOffers?.find(
    o => o.paymentMode === 'free-trial',
  );

  const baseOffer = subscription?.subscriptionOffers?.find(
    o => o.basePlanIdAndroid,
  );

  const displayPrice = baseOffer?.displayPrice ?? subscription?.subscriptionOffers?.[0]?.displayPrice;

  return {
    isPremium,
    isLoading: statusLoading,
    isPurchasing,
    connected,
    subscription,
    trialOffer,
    displayPrice,
    purchaseSubscription,
    restorePurchases: handleRestore,
    refreshStatus,
  };
}
