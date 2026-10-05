import { useState, useCallback } from 'react';

export function useActionFeedback() {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const markPending = useCallback((id: string) => {
    setPendingIds(prev => new Set(prev).add(id));
  }, []);

  const clearPending = useCallback((id: string) => {
    setPendingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const markUpdated = useCallback((id: string, durationMs = 800) => {
    setUpdatedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setUpdatedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, durationMs);
  }, []);

  const markAdded = useCallback((id: string, durationMs = 800) => {
    setAddedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, durationMs);
  }, []);

  const triggerDeleteWithAnimation = useCallback((id: string, actionCallback: () => Promise<void> | void, animationDelay = 350) => {
    setDeletingIds(prev => new Set(prev).add(id));
    setPendingIds(prev => new Set(prev).add(id));
    setTimeout(async () => {
      try {
        await actionCallback();
      } finally {
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setPendingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }, animationDelay);
  }, []);

  const getItemAnimationClass = useCallback((id: string) => {
    if (deletingIds.has(id)) return 'animate-action-deleting pointer-events-none opacity-50';
    if (updatedIds.has(id)) return 'animate-action-updated ring-2 ring-[#ea4c89]/40 rounded-xl';
    if (addedIds.has(id)) return 'animate-action-added';
    return '';
  }, [deletingIds, updatedIds, addedIds]);

  return {
    pendingIds,
    updatedIds,
    deletingIds,
    addedIds,
    markPending,
    clearPending,
    markUpdated,
    markAdded,
    triggerDeleteWithAnimation,
    getItemAnimationClass,
    isPending: useCallback((id: string) => pendingIds.has(id), [pendingIds]),
    isDeleting: useCallback((id: string) => deletingIds.has(id), [deletingIds]),
  };
}

export default useActionFeedback;
