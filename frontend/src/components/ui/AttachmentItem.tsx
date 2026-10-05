import React from 'react';
import { FileText, Image as ImageIcon, Download, Trash2 } from 'lucide-react';
import type { TaskAttachment } from '../../features/tasks/types/TaskTypes';

interface AttachmentItemProps {
  file: TaskAttachment;
  onRemove?: () => void;
  showDownload?: boolean;
}

export const isImageFile = (file: { fileType?: string; fileUrl?: string; fileName?: string }): boolean => {
  if (file.fileType && file.fileType.toLowerCase().startsWith('image/')) return true;
  if (file.fileUrl && (file.fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(file.fileUrl))) return true;
  if (file.fileName && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.fileName)) return true;
  return false;
};

export const downloadAttachment = (fileUrl: string, fileName: string) => {
  if (!fileUrl) return;
  
  const a = document.createElement('a');
  a.href = fileUrl;
  a.download = fileName || 'attachment';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const AttachmentItem: React.FC<AttachmentItemProps> = ({ file, onRemove, showDownload = true }) => {
  const isImg = isImageFile(file);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-800 text-xs transition-all duration-200 hover:border-gray-300 dark:hover:border-slate-700 animate-action-added">
      <div className="flex items-center gap-2.5 overflow-hidden mr-2 min-w-0">
        {isImg ? (
          file.fileUrl && (file.fileUrl.startsWith('data:image/') || file.fileUrl.startsWith('http')) ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0 bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
              <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#ea4c89] flex items-center justify-center shrink-0 border border-pink-100 dark:border-pink-900/30">
              <ImageIcon size={16} />
            </div>
          )
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
            <FileText size={16} />
          </div>
        )}

        <div className="min-w-0 flex flex-col">
          <span className="font-bold text-gray-800 dark:text-gray-200 truncate" title={file.fileName}>
            {file.fileName}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : (isImg ? 'Image' : 'Document')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {showDownload && file.fileUrl && (
          <button
            type="button"
            onClick={() => downloadAttachment(file.fileUrl, file.fileName)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
            title={`Download ${file.fileName}`}
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
            title="Remove Attachment"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AttachmentItem;
