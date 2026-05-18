import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSubscriptions } from '@/hooks/use-subscriptions';

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isPremium, isLoading, error } = useSubscriptions();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshSubscription = async () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        isLoading,
        error,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
}
