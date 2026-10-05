import { useState, useEffect, useCallback } from 'react';

export const usePersistentTimer = (storageKey: string, initialSeconds: number) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const endTimeStr = localStorage.getItem(storageKey);
    if (!endTimeStr) return 0;
    
    const endTime = parseInt(endTimeStr, 10);
    const now = Date.now();
    
    if (now >= endTime) {
      localStorage.removeItem(storageKey);
      return 0;
    }
    return Math.ceil((endTime - now) / 1000);
  });

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.removeItem(storageKey);
          return 0;
        }
        // Sync with localstorage just in case there's slight drift, but decrementing is smoother visually
        // Actually, let's recalculate accurately every tick to handle tab sleeping
        const endTimeStr = localStorage.getItem(storageKey);
        if (!endTimeStr) return 0;
        const endTime = parseInt(endTimeStr, 10);
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(interval);
          localStorage.removeItem(storageKey);
          return 0;
        }
        return remaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, storageKey]);

  const startTimer = useCallback(() => {
    const endTime = Date.now() + initialSeconds * 1000;
    localStorage.setItem(storageKey, endTime.toString());
    setTimeLeft(initialSeconds);
  }, [initialSeconds, storageKey]);

  return { timeLeft, startTimer };
};
