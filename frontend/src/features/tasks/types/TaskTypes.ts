export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt?: string;
}

export interface EmployeeTask {
  id: string;
  taskId?: number | string;
  title: string;
  description: string;
  assignedTo: any;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  history?: Array<{
    status: TaskStatus;
    updatedBy: any;
    timestamp: string;
  }>;
  attachments?: TaskAttachment[];
}
