import { useState, useEffect, useCallback } from 'react';

export const usePersistentTimer = (storageKey: string, initialSeconds: number) => {
  const getRemainingSeconds = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch (e) {}
    const endTimeStr = sessionStorage.getItem(storageKey);
    if (!endTimeStr) return 0;
    
    const endTime = parseInt(endTimeStr, 10);
    if (isNaN(endTime)) return 0;
    
    const now = Date.now();
    const remaining = Math.ceil((endTime - now) / 1000);
    
    if (remaining <= 0) {
      sessionStorage.removeItem(storageKey);
      return 0;
    }
    return remaining;
  }, [storageKey]);

  const [timeLeft, setTimeLeft] = useState<number>(() => getRemainingSeconds());

  useEffect(() => {
    const remaining = getRemainingSeconds();
    setTimeLeft(remaining);
  }, [getRemainingSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, getRemainingSeconds]);

  const startTimer = useCallback((customSeconds?: number) => {
    const secs = customSeconds ?? initialSeconds;
    const endTime = Date.now() + secs * 1000;
    try { localStorage.removeItem(storageKey); } catch (e) {}
    sessionStorage.setItem(storageKey, endTime.toString());
    setTimeLeft(secs);
  }, [initialSeconds, storageKey]);

  const resetTimer = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch (e) {}
    sessionStorage.removeItem(storageKey);
    setTimeLeft(0);
  }, [storageKey]);

  return { timeLeft, startTimer, resetTimer };
};
