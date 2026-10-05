import { useState, useEffect, useRef } from "react";
import type { EmployeeTask, TaskAttachment } from "../types/TaskTypes";
import { useAuth } from "../../../contexts/AuthContext";
import api from "../../../services/api";
import CustomDatePicker, { parseDateStr } from "../../../components/CustomDatePicker";
import { UploadCloud } from "lucide-react";
import AttachmentItem from "../../../components/ui/AttachmentItem";

const formatDateCustom = (d: Date | string) => {
  if (!d) return "";
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
};

interface TaskFormProps {
  initialData?: EmployeeTask | null;
  onSubmit: (task: Omit<EmployeeTask, "id" | "createdAt">) => void;
  onCancel: () => void;
}

const TaskForm = ({ initialData, onSubmit, onCancel }: TaskFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<EmployeeTask["status"]>("Pending");
  const [priority, setPriority] = useState<EmployeeTask["priority"]>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin";
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/auth/all').then(res => setUsers(res.data)).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setAssignedTo(typeof initialData.assignedTo === 'object' ? ((initialData.assignedTo as any)?._id || "") : (initialData.assignedTo || ""));
      setStatus(isAdmin ? "Pending" : initialData.status || "Pending");
      setPriority(initialData.priority || "Medium");
      setAttachments(initialData.attachments || []);
      if (initialData.dueDate) {
        try {
          const d = new Date(initialData.dueDate);
          if (!isNaN(d.getTime())) {
            setDueDate(formatDateCustom(d));
          } else {
            setDueDate("");
          }
        } catch (e) {
          setDueDate("");
        }
      } else {
        setDueDate("");
      }
    } else if (isAdmin) {
      setStatus("Pending");
      setAttachments([]);
    }
  }, [initialData, isAdmin]);

  const handleFilesAdded = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileUrl = e.target?.result as string;
        setAttachments(prev => [
          ...prev,
          {
            fileName: file.name,
            fileUrl,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTitleChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z\s]/g, "").slice(0, 100);
    setTitle(cleaned);
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: "" }));
    }
  };

  const handleDescriptionChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9\s.,\-]/g, "").slice(0, 300);
    setDescription(cleaned);
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = "Task title is required";
    } else if (title.length > 100) {
      newErrors.title = `Task title cannot exceed 100 characters (currently ${title.length} characters)`;
    } else if (/\s{2,}/.test(title)) {
      newErrors.title = "Task title cannot contain continuous spaces";
    } else if (!/^[a-zA-Z\s]*$/.test(title)) {
      newErrors.title = "Task title cannot contain numbers or special characters";
    }

    if (!description.trim()) {
      newErrors.description = "Task description is required";
    } else if (description.length > 300) {
      newErrors.description = `Task description cannot exceed 300 characters (currently ${description.length} characters)`;
    } else if (/\s{2,}/.test(description)) {
      newErrors.description = "Task description cannot contain continuous spaces";
    } else if (!/^[a-zA-Z0-9\s.,\-]*$/.test(description)) {
      newErrors.description = "Task description can only contain letters, numbers, spaces, commas, hyphens, and full stops";
    }

    if (isAdmin) {
      if (!assignedTo) {
        newErrors.assignedTo = "Assignee is required";
      } else {
        const selectedUser = users.find(u => u._id === assignedTo);
        if (selectedUser?.isBlocked) {
          newErrors.assignedTo = "This user is blocked and cannot be assigned tasks.";
        }
      }
      if (!priority) newErrors.priority = "Priority is required";
      if (!dueDate) newErrors.dueDate = "Due Date is required";
      else {
        const selectedDate = parseDateStr(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today && !initialData) {
          newErrors.dueDate = "Due date cannot be in the past";
        }
      }
    }

    if (!status) newErrors.status = "Status is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let formattedDueDate = dueDate;
    try {
      const d = parseDateStr(dueDate);
      if (!isNaN(d.getTime())) {
        formattedDueDate = d.toISOString();
      }
    } catch (e) {
      formattedDueDate = new Date().toISOString();
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      status: isAdmin ? "Pending" : status,
      priority,
      dueDate: formattedDueDate,
      attachments
    });
  };

  const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900/30";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";
  const errorClass = "mt-1 text-xs text-red-500 dark:text-red-400 font-medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass}>Task Title *</label>
          <span className={`text-xs font-semibold ${title.length >= 100 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {title.length}/100 characters
          </span>
        </div>
        <input 
          type="text" 
          maxLength={100}
          value={title} 
          onChange={(e) => handleTitleChange(e.target.value)} 
          className={inputClass} 
          placeholder="Enter task title (letters and spaces only)..."
          disabled={!isAdmin}
        />
        {errors.title && <p className={errorClass}>{errors.title}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass}>Task Description *</label>
          <span className={`text-xs font-semibold ${description.length >= 300 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {description.length}/300 characters
          </span>
        </div>
        <textarea 
          value={description} 
          maxLength={300}
          onChange={(e) => handleDescriptionChange(e.target.value)} 
          className={`${inputClass} min-h-[90px]`} 
          placeholder="Detailed task description (allowed: letters, numbers, spaces, commas, hyphens, and full stops)..."
          disabled={!isAdmin}
        />
        {errors.description && <p className={errorClass}>{errors.description}</p>}
      </div>

      {isAdmin && (
        <div>
          <label className={labelClass}>Assigned To *</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={inputClass}
          >
            <option value="">Select an employee...</option>
            {users.filter(u => u.role !== 'Admin' && u.isVerified && u.isProfileComplete !== false).map(user => {
              const isUserBlocked = !!user.isBlocked;
              const initialAssignedId = typeof initialData?.assignedTo === 'object' ? (initialData.assignedTo as any)?._id : initialData?.assignedTo;
              const isCurrentlyAssigned = user._id === initialAssignedId;
              const isDisabled = isUserBlocked && !isCurrentlyAssigned;
              return (
                <option key={user._id} value={user._id} disabled={isDisabled}>
                  {user.firstName} {user.lastName} ({user.email}){isUserBlocked ? ' - (Blocked)' : ''}
                </option>
              );
            })}
          </select>
          {errors.assignedTo && <p className={errorClass}>{errors.assignedTo}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status *</label>
          {isAdmin ? (
            <select value="Pending" disabled className={`${inputClass} bg-gray-100 dark:bg-slate-800 cursor-not-allowed opacity-90`}>
              <option value="Pending">Pending</option>
            </select>
          ) : (
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputClass}>
              {status === "Pending" && <option value="Pending">Pending</option>}
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          )}
          {errors.status && <p className={errorClass}>{errors.status}</p>}
        </div>

        {isAdmin && (
          <div>
            <label className={labelClass}>Priority *</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className={inputClass}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            {errors.priority && <p className={errorClass}>{errors.priority}</p>}
          </div>
        )}
      </div>

      {isAdmin && (
        <div>
          <label className={labelClass}>Due Date *</label>
          <CustomDatePicker
            value={dueDate}
            onChange={(dateStr) => {
              setDueDate(dateStr);
              if (errors.dueDate) {
                setErrors(prev => ({ ...prev, dueDate: "" }));
              }
            }}
            placeholder="Due Date (e.g. 24 Dec 2026)"
            hasError={!!errors.dueDate}
            placement="top"
            disablePast={true}
          />
          {errors.dueDate && <p className={errorClass}>{errors.dueDate}</p>}
        </div>
      )}

      {/* Document & Image Attachments (Admin Drag & Drop Zone at the end of form) */}
      {isAdmin && (
        <div className="space-y-2 pt-1">
          <label className={labelClass}>Attach Detailed Documents / Instructions (Optional)</label>
          
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging 
                ? "border-[#ea4c89] bg-[#ea4c89]/5" 
                : "border-gray-300 dark:border-gray-700 hover:border-[#ea4c89] dark:hover:border-[#ea4c89] bg-gray-50/50 dark:bg-slate-900/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-[#a855f7] flex items-center justify-center">
                <UploadCloud size={20} />
              </div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                Drag & drop files here, or <span className="text-[#ea4c89] underline">browse files</span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Upload PDFs, Word Documents, Images, or Text files
              </p>
            </div>
          </div>

          {/* Attached Files List with Industry-Grade Image Thumbnail vs Document Icon */}
          {attachments.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Attached Files ({attachments.length}):
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {attachments.map((file, idx) => (
                  <AttachmentItem
                    key={idx}
                    file={file}
                    onRemove={() => removeAttachment(idx)}
                    showDownload={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        {isAdmin && (
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 px-4 py-2 text-sm font-medium text-white transition-all shadow-sm cursor-pointer"
          >
            {initialData ? "Update Task" : "Create Task"}
          </button>
        )}
        {!isAdmin && initialData && (
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 px-4 py-2 text-sm font-medium text-white transition-all shadow-sm cursor-pointer"
          >
            Update Status
          </button>
        )}
      </div>
    </form>
  );
};

export default TaskForm;
