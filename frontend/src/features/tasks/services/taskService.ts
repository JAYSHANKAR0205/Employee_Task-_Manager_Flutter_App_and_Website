import api from '../../../services/api';
import type { EmployeeTask } from "../types/TaskTypes";

/**
 * Fetch all real tasks from MongoDB database
 */
export const getTasks = async (): Promise<EmployeeTask[]> => {
  const response = await api.get('/tasks');
  return response.data;
};

/**
 * Create a new real task in MongoDB database
 */
export const createTask = async (task: Omit<EmployeeTask, "id" | "createdAt">): Promise<EmployeeTask> => {
  const response = await api.post('/tasks', task);
  return response.data;
};

/**
 * Update an existing task in MongoDB database
 */
export const updateTask = async (id: string, updates: Partial<EmployeeTask>): Promise<EmployeeTask> => {
  const response = await api.put(`/tasks/${id}`, updates);
  return response.data;
};

/**
 * Delete a task from MongoDB database
 */
export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

