import { useState, useCallback } from 'react';

export const useTokenUsage = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTokenUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/tokens/usage');
      const result = await response.json();
      
      if (result.success) {
        setUsage(result.data);
      } else {
        setError('Failed to fetch usage data');
      }
    } catch (err) {
      console.error('Error fetching token usage:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUsage = useCallback(() => {
    fetchTokenUsage();
  }, [fetchTokenUsage]);

  return {
    usage,
    loading,
    error,
    refreshUsage,
    fetchTokenUsage
  };
}; 