import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (!message) return;

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);

    // Replace any existing active toast so only a single toast is shown at any time
    setToasts([{ id, message, type }]);

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id === id ? false : true));
    }, 3500);
  }, []);

  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
    info: (msg: string) => showToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      {createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2.5 w-full max-w-lg sm:max-w-xl px-4 pointer-events-none">
          {toasts.map((t) => {
            let bgStyle = "bg-emerald-600 text-white border-emerald-500 shadow-lg";
            let icon = <CheckCircle2 size={18} className="text-white shrink-0" />;

            if (t.type === 'error') {
              bgStyle = "bg-red-950/95 dark:bg-red-900/95 text-white border-red-800/80";
              icon = <AlertCircle size={18} className="text-red-400 shrink-0" />;
            } else if (t.type === 'warning') {
              bgStyle = "bg-amber-950/95 dark:bg-amber-900/95 text-white border-amber-800/80";
              icon = <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
            } else if (t.type === 'info') {
              bgStyle = "bg-blue-950/95 dark:bg-blue-900/95 text-white border-blue-800/80";
              icon = <Info size={18} className="text-blue-400 shrink-0" />;
            }

            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-center justify-between gap-3 w-auto max-w-full rounded-2xl p-3.5 px-4 shadow-2xl backdrop-blur-md border ${bgStyle} transition-all duration-300 animate-in fade-in slide-in-from-top-4`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {icon}
                  <span className="font-semibold text-xs sm:text-sm leading-snug tracking-wide break-words">{t.message}</span>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
