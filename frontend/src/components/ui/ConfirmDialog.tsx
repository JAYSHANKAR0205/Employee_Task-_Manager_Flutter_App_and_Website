import { AlertTriangle, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
}

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", isLoading = false }: ConfirmDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setIsSubmitting(false);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const activeLoading = isLoading || isSubmitting;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Full-screen backdrop overlay covering sidebar, header, and entire window */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in cursor-pointer"
        onClick={activeLoading ? undefined : onClose}
      />
      
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>

          <button 
            disabled={activeLoading}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            disabled={activeLoading}
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 cursor-pointer border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={activeLoading}
            onClick={handleConfirm}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 cursor-pointer shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {activeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
