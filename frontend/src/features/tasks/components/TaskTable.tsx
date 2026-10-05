/**
 * @file TaskTable.tsx
 * @description Task Data Table & Details Modal UI Component.
 * 
 * WORK OF THIS FILE:
 * - Renders tasks in a clean tabular view displaying Task ID, Task Title & Description, Assignee, Priority, Status, Dates, and Action buttons.
 * - Displays complete, well-formatted task details in a dedicated Modal card when the user clicks the Eye (View) icon.
 * - Resolves employee names for assignees and wraps long unspaced text strings to prevent modal/table overflow.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { EmployeeTask } from "../types/TaskTypes";
import { Inbox, Edit2, Trash2, Eye, X, User as UserIcon, Calendar, Clock, Paperclip } from "lucide-react";
import api from "../../../services/api";

import BadgePill from "../../../components/ui/BadgePill";
import AttachmentItem from "../../../components/ui/AttachmentItem";

const getStatusBadge = (status: EmployeeTask["status"]) => {
  switch (status) {
    case "Completed":
      return <BadgePill label="Completed" variant="green" />;
    case "In Progress":
      return <BadgePill label="In Progress" variant="blue" />;
    case "Pending":
    default:
      return <BadgePill label="Pending" variant="amber" />;
  }
};

const getPriorityBadge = (priority: EmployeeTask["priority"]) => {
  switch (priority) {
    case "High": 
      return <BadgePill label="High" variant="red" />;
    case "Medium": 
      return <BadgePill label="Medium" variant="amber" />;
    case "Low": 
      return <BadgePill label="Low" variant="cyan" />;
  }
};

const getAssigneeName = (assignedTo: any, usersList: any[] = []): string => {
  let rawName = "Unassigned";
  if (!assignedTo) {
    rawName = "Unassigned";
  } else if (typeof assignedTo === "object") {
    const { firstName, lastName, email } = assignedTo;
    if (firstName || lastName) {
      rawName = `${firstName || ""} ${lastName || ""}`.trim();
    } else if (email) {
      rawName = email;
    }
  } else {
    const idStr = String(assignedTo);
    const foundUser = usersList.find(u => u._id === idStr || u.id === idStr);
    if (foundUser) {
      const { firstName, lastName, email } = foundUser;
      if (firstName || lastName) {
        rawName = `${firstName || ""} ${lastName || ""}`.trim();
      } else if (email) {
        rawName = email;
      }
    } else if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
      rawName = "Assigned Employee";
    } else {
      rawName = idStr;
    }
  }

  if (rawName && rawName.length > 20) {
    return rawName.slice(0, 20) + '...';
  }
  return rawName;
};

const getFormattedTaskId = (task: EmployeeTask, index: number) => {
  if ((task as any).taskId) {
    return `#${(task as any).taskId}`;
  }
  return `#${5001 + index}`;
};

interface TaskTableProps {
  tasks: EmployeeTask[];
  onEdit: (task: EmployeeTask) => void;
  onDelete?: (task: EmployeeTask) => void;
  viewMode?: "dashboard" | "tasks";
  isAdmin?: boolean;
}

const TaskTable = ({ tasks, onEdit, onDelete, viewMode = "tasks", isAdmin = false }: TaskTableProps) => {
  const [selectedTaskModal, setSelectedTaskModal] = useState<{ task: EmployeeTask; formattedId: string } | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    if (selectedTaskModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedTaskModal]);

  useEffect(() => {
    api.get('/auth/all')
      .then(res => {
        if (Array.isArray(res.data)) {
          setUsersList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [tasks]);

  const totalPages = Math.ceil(tasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayTasks = viewMode === "dashboard" 
    ? tasks.slice(0, 4) 
    : tasks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm transition-colors duration-300 dark:bg-slate-900 dark:border dark:border-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {viewMode === "dashboard" ? "Recent Tasks" : "Task Overview"}
        </h2>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          {viewMode === "dashboard" ? `${displayTasks.length} Recent` : `${tasks.length} Tasks`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 rounded-tl-lg whitespace-nowrap">Task ID</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">Task</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Assignee</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Priority</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Created At</th>
              <th className={`px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap ${viewMode === "dashboard" ? "rounded-tr-lg" : ""}`}>Due Date</th>
              {viewMode !== "dashboard" && (
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 rounded-tr-lg whitespace-nowrap">Actions</th>
              )}
            </tr>
          </thead>

          <tbody>
            {displayTasks.length > 0 ? (
              displayTasks.map((task, index) => {
                const formattedId = getFormattedTaskId(task, viewMode === "dashboard" ? index : startIndex + index);
                return (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    key={task.id} 
                    className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-slate-800/50"
                  >
                    {/* Task ID Column */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formattedId}
                    </td>

                    {/* Task Title & Description Column */}
                    <td className="px-4 py-4 max-w-xs md:max-w-md whitespace-normal">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-900 dark:text-gray-100 break-words line-clamp-1 truncate max-w-[240px]" title={task.title}>
                          {task.title}
                        </div>
                        {task.attachments && task.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-[#a855f7] dark:bg-purple-900/30 dark:text-purple-300 shrink-0">
                            <Paperclip size={12} /> {task.attachments.length}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 truncate max-w-[300px] break-words" title={task.description}>
                        {task.description}
                      </div>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {getAssigneeName(task.assignedTo, usersList)}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-4 whitespace-nowrap">{getPriorityBadge(task.priority)}</td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(task.status)}</td>

                    {/* Created At */}
                    <td className="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    {viewMode !== "dashboard" && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setSelectedTaskModal({ task, formattedId })}
                            className="rounded-lg p-2 text-indigo-500 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                            title="View Task Details"
                          >
                            <Eye size={16} />
                          </button>

                          <button 
                            onClick={() => onEdit(task)}
                            className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                            title="Edit Task"
                          >
                            <Edit2 size={16} />
                          </button>

                          {isAdmin && onDelete && (
                            <button 
                              onClick={() => onDelete(task)}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                              title="Delete Task"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={viewMode === "dashboard" ? 7 : 8} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800">
                      <Inbox size={32} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-base font-medium text-gray-600 dark:text-gray-300">No tasks yet</p>
                    <p className="text-sm">Tasks will appear here once created.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Task Pagination Controls */}
      {viewMode !== "dashboard" && tasks.length > itemsPerPage && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">
          <div>
            Showing <span className="font-bold text-gray-800 dark:text-gray-200">{startIndex + 1}</span> to{" "}
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {Math.min(startIndex + itemsPerPage, tasks.length)}
            </span>{" "}
            of <span className="font-bold text-gray-800 dark:text-gray-200">{tasks.length}</span> tasks
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer font-bold"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? "bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white shadow-xs"
                      : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Task Details Card Modal */}
      {selectedTaskModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Full-screen backdrop overlay covering sidebar, header, and entire window */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in cursor-pointer" 
            onClick={() => setSelectedTaskModal(null)} 
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="pr-4 max-w-[85%]">
                <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  {selectedTaskModal.formattedId}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1.5 break-words break-all leading-snug">
                  {selectedTaskModal.task.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTaskModal(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-sm">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedTaskModal.task.status)}
                {getPriorityBadge(selectedTaskModal.task.priority)}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Description</p>
                <div className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap rounded-xl bg-gray-50 p-3.5 text-xs dark:bg-slate-800/60 leading-relaxed break-words break-all max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-slate-800">
                  {selectedTaskModal.task.description || "No description provided."}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800/80">
                  <UserIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Assignee</p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {getAssigneeName(selectedTaskModal.task.assignedTo, usersList)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800/80">
                  <Calendar className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Due Date</p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                      {selectedTaskModal.task.dueDate ? new Date(selectedTaskModal.task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 col-span-2">
                  <Clock className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Created At</p>
                    <p className="mt-0.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                      {selectedTaskModal.task.createdAt ? new Date(selectedTaskModal.task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attached Documents */}
              {selectedTaskModal.task.attachments && selectedTaskModal.task.attachments.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-[#ea4c89]" /> Attached Documents ({selectedTaskModal.task.attachments.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {selectedTaskModal.task.attachments.map((file, idx) => (
                      <AttachmentItem key={idx} file={file} showDownload={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* History Timeline */}
              {selectedTaskModal.task.history && selectedTaskModal.task.history.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Status Audit History</p>
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {selectedTaskModal.task.history.map((h, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Status: <strong className="text-blue-600 dark:text-blue-400">{h.status}</strong></span>
                        <span className="text-gray-400">{new Date(h.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                onClick={() => setSelectedTaskModal(null)}
                className="rounded-xl bg-gray-100 dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TaskTable;