import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const TaskModal = ({ isOpen, onClose, title, children }: TaskModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-24 pb-8 overflow-y-auto">
      {/* Full-screen backdrop overlay covering sidebar, header, and entire window */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in cursor-pointer"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-gray-800 my-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskModal;
