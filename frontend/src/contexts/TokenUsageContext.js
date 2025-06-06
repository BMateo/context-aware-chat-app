import React, { createContext, useContext, useEffect } from 'react';
import { useTokenUsage } from '../hooks/useTokenUsage';

const TokenUsageContext = createContext();

export const useTokenUsageContext = () => {
  const context = useContext(TokenUsageContext);
  if (!context) {
    throw new Error('useTokenUsageContext must be used within a TokenUsageProvider');
  }
  return context;
};

export const TokenUsageProvider = ({ children }) => {
  const tokenUsage = useTokenUsage();

  // Fetch initial usage on mount
  useEffect(() => {
    tokenUsage.fetchTokenUsage();
  }, [tokenUsage.fetchTokenUsage]);

  return (
    <TokenUsageContext.Provider value={tokenUsage}>
      {children}
    </TokenUsageContext.Provider>
  );
}; 