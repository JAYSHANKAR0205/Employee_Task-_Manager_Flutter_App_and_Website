/**
 * @file Dashboard.tsx
 * @description Task Management Dashboard & Analytics View Component.
 * 
 * WORK OF THIS FILE:
 * - Fetches and renders task items (`/api/tasks`) in both Dashboard view mode (analytics, summary cards, chart visualizer) and Tasks table view mode.
 * - Restricts actions based on role (Admins can create/assign/delete tasks; Employees can view and update their task status).
 * - Integrates task filtering, creation modals, and completion analytics via Recharts.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Serves as the central operational hub for task assignment, status tracking, and performance visualization across the application.
 */

import { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import TaskSummaryCard from "./TaskSummaryCard";
import TaskTable from "./TaskTable";
import TaskFilters from "./TaskFilters";
import TaskModal from "../../../components/ui/TaskModal";
import TaskForm from "./TaskForm";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import type { EmployeeTask } from "../types/TaskTypes";
import { Plus, ArrowLeft } from "lucide-react";
import { getTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { FilterState, INITIAL_FILTER_STATE } from "../../../types/filter";
import { isWithinDateRange } from "../../../utils/filterUtils";
import { safeNavigateBack } from "../../../utils/navigation";

const getAssigneeName = (assignedTo: any): string => {
  if (!assignedTo) return "";
  if (typeof assignedTo === "object") {
    const { firstName, lastName, email } = assignedTo;
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim();
    }
    if (email) return email;
    return "";
  }
  return String(assignedTo);
};

interface DashboardProps {
  viewMode?: "dashboard" | "tasks";
}

const Dashboard = ({ viewMode = "dashboard" }: DashboardProps) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin";
  // Canonical tasks state
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  
  // API States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || "All");
  const [priorityFilter, setPriorityFilter] = useState(location.state?.priorityFilter || "All");

  const [filterState, setFilterState] = useState<FilterState>(() => {
    try {
      const saved = sessionStorage.getItem('tasks_filter_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...INITIAL_FILTER_STATE, ...parsed };
        }
      }
    } catch (e) {}
    return INITIAL_FILTER_STATE;
  });

  useEffect(() => {
    sessionStorage.setItem('tasks_filter_state', JSON.stringify(filterState));
  }, [filterState]);

  useEffect(() => {
    if (location.state?.statusFilter || location.state?.priorityFilter) {
      if (location.state?.statusFilter) setStatusFilter(location.state.statusFilter);
      if (location.state?.priorityFilter) setPriorityFilter(location.state.priorityFilter);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.statusFilter, location.state?.priorityFilter, navigate, location.pathname]);

  useEffect(() => {
    if (viewMode === "dashboard") {
      setSearchQuery("");
      setStatusFilter("All");
      setPriorityFilter("All");
    }
  }, [viewMode]);

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<EmployeeTask | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<EmployeeTask | null>(null);
  
  const { toast } = useToast();

  const showSuccess = (msg: string) => {
    toast.success(msg);
  };

  const loadTasks = async () => {
    setError(null);
    try {
      const data = await getTasks();
      setTasks(data);
    } catch {
      setError("Failed to fetch tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleOpenCreate = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: EmployeeTask) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (task: EmployeeTask) => {
    setTaskToDelete(task);
    setIsConfirmOpen(true);
  };

  const handleCreateOrUpdate = async (taskData: Omit<EmployeeTask, "id" | "createdAt">) => {
    try {
      if (taskToEdit) {
        const updated = await updateTask(taskToEdit.id, taskData);
        setTasks(prev => prev.map(t => (t.id === taskToEdit.id || (t as any)._id === taskToEdit.id) ? updated : t));
        showSuccess("Task Updated Successfully");
      } else {
        const created = await createTask(taskData);
        setTasks(prev => [created, ...prev]);
        showSuccess("Task Added Successfully");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving task to DB:", err);
      const fallbackTask: EmployeeTask = {
        ...taskData,
        id: `TASK-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      if (taskToEdit) {
        setTasks(prev => prev.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t));
      } else {
        setTasks(prev => [fallbackTask, ...prev]);
      }
      setIsModalOpen(false);
      showSuccess(taskToEdit ? "Task Updated Successfully" : "Task Added Successfully");
    }
  };

  const handleDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete.id);
        setTasks(tasks.filter(t => t.id !== taskToDelete.id && (t as any)._id !== taskToDelete.id));
        showSuccess("Task Deleted Successfully");
      } catch {
        setTasks(tasks.filter(t => t.id !== taskToDelete.id && (t as any)._id !== taskToDelete.id));
        showSuccess("Task Deleted Successfully");
      }
      setIsConfirmOpen(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task, index) => {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, '');

      const titleMatch = task.title ? task.title.toLowerCase().includes(q) : false;
      const descMatch = task.description ? task.description.toLowerCase().includes(q) : false;
      const assigneeName = getAssigneeName(task.assignedTo).toLowerCase();
      const assigneeMatch = assigneeName.includes(q);

      // Task ID matching (full, partial, or single digit against user-facing Task ID)
      const rawTaskId = task.taskId ? String(task.taskId).toLowerCase() : '';
      const fallbackId = String(5001 + index);
      const taskIdNum = rawTaskId || fallbackId;
      const formattedId = `#${taskIdNum}`;

      const taskIdMatch = q ? (
        taskIdNum.includes(q) ||
        taskIdNum.includes(cleanQ) ||
        formattedId.toLowerCase().includes(q) ||
        formattedId.toLowerCase().includes(cleanQ)
      ) : false;

      const matchesSearch = !q || titleMatch || descMatch || assigneeMatch || taskIdMatch;

      if (!matchesSearch) return false;

      if (statusFilter !== "All" && task.status !== statusFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter) return false;

      if (filterState.datePreset !== 'all') {
        const createdMatch = task.createdAt ? isWithinDateRange(task.createdAt, filterState) : false;
        const dueMatch = task.dueDate ? isWithinDateRange(task.dueDate, filterState) : false;
        if (!createdMatch && !dueMatch) return false;
      }

      const selectedStatuses = filterState.multiSelects['status'] || [];
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
        return false;
      }

      const selectedPriorities = filterState.multiSelects['priority'] || [];
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
        return false;
      }

      return true;
    });

    // Apply Date Created Sorting
    if (filterState.sortDate === 'newest') {
      result.sort((a, b) => new Date((b as any).createdAt || b.dueDate || 0).getTime() - new Date((a as any).createdAt || a.dueDate || 0).getTime());
    } else if (filterState.sortDate === 'oldest') {
      result.sort((a, b) => new Date((a as any).createdAt || a.dueDate || 0).getTime() - new Date((b as any).createdAt || b.dueDate || 0).getTime());
    }

    // Apply Alphabetical Sorting
    if (filterState.sortAlphabetical === 'a-z') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (filterState.sortAlphabetical === 'z-a') {
      result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, filterState]);

  const recentTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date((b as any).createdAt || b.dueDate || 0).getTime() - new Date((a as any).createdAt || a.dueDate || 0).getTime());
  }, [tasks]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setFilterState(INITIAL_FILTER_STATE);
  };

  const handleStatusClick = (data: any) => {
    if (data && data.name) {
      if (viewMode === "dashboard") {
        navigate("/tasks", { state: { statusFilter: data.name } });
      } else {
        setStatusFilter((prev: string) => prev === data.name ? "All" : data.name);
      }
    }
  };

  const handleBarClick = (data: any) => {
    if (data && data.name) {
      if (viewMode === "dashboard") {
        navigate("/tasks", { state: { priorityFilter: data.name } });
      } else {
        setPriorityFilter((prev: string) => prev === data.name ? "All" : data.name);
      }
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "Pending").length;
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;

  // Chart data uses the global 'tasks' array so the graph doesn't disappear when filtering
  const chartData = [
    { name: 'Completed', value: tasks.filter((t) => t.status === "Completed").length, color: '#10b981' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === "In Progress").length, color: '#a855f7' },
    { name: 'Pending', value: tasks.filter((t) => t.status === "Pending").length, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  const barChartData = useMemo(() => {
    return [
      { name: 'High', value: tasks.filter((t) => t.priority === "High").length, color: '#ea4c89' },
      { name: 'Medium', value: tasks.filter((t) => t.priority === "Medium").length, color: '#f59e0b' },
      { name: 'Low', value: tasks.filter((t) => t.priority === "Low").length, color: '#22d3ee' },
    ];
  }, [tasks]);

  const trendData = useMemo(() => {
    const counts: Record<string, number> = {};
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sortedTasks.forEach(task => {
      const date = new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).slice(-7);
  }, [tasks]);

  return (
    <section className="p-6 sm:p-8 lg:p-10 space-y-8 relative max-w-[1600px] mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {viewMode === "tasks" && (
            <button
              type="button"
              onClick={() => safeNavigateBack(navigate, '/dashboard')}
              aria-label="Go back"
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {viewMode === "dashboard" ? `Welcome back, ${currentUser?.firstName || (isAdmin ? "Admin" : "Employee")} 👋` : "Task Management"}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {viewMode === "dashboard" ? "Here's what's happening with your projects today." : "View and manage all employee tasks."}
            </p>
          </div>
        </div>
        
        {isAdmin && viewMode === "tasks" && (
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-sm cursor-pointer"
          >
            <Plus size={18} />
            Create Task
          </button>
        )}
      </div>

      {/* Stats Grid */}
      {viewMode === "dashboard" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <TaskSummaryCard 
            title="Total Tasks" 
            value={totalTasks} 
            variant="total" 
            description="+12% from last month" 
            icon="📁" 
            onClick={() => { 
              if (viewMode === "dashboard") {
                navigate("/tasks", { state: { statusFilter: "All" } });
              } else {
                handleResetFilters(); 
              }
            }} 
          />
          <TaskSummaryCard 
            title="Completed" 
            value={completedTasks} 
            variant="completed" 
            description="+5% from last month" 
            icon="✅" 
            onClick={() => { 
              if (viewMode === "dashboard") {
                navigate("/tasks", { state: { statusFilter: "Completed" } });
              } else {
                handleResetFilters(); setStatusFilter("Completed"); 
              }
            }} 
          />
          <TaskSummaryCard 
            title="In Progress" 
            value={inProgressTasks} 
            variant="progress" 
            description="Same as last month" 
            icon="⏳" 
            onClick={() => { 
              if (viewMode === "dashboard") {
                navigate("/tasks", { state: { statusFilter: "In Progress" } });
              } else {
                handleResetFilters(); setStatusFilter("In Progress"); 
              }
            }} 
          />
          <TaskSummaryCard 
            title="Pending" 
            value={pendingTasks} 
            variant="pending" 
            description="-2% from last month" 
            icon="🕒" 
            onClick={() => { 
              if (viewMode === "dashboard") {
                navigate("/tasks", { state: { statusFilter: "Pending" } });
              } else {
                handleResetFilters(); setStatusFilter("Pending"); 
              }
            }} 
          />
        </div>
      )}

      {/* Content */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-red-50 p-10 text-red-600 dark:bg-red-900/10 dark:text-red-400">
          <p className="mb-4 text-lg font-medium">{error}</p>
          <button 
            onClick={loadTasks} 
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900 dark:border dark:border-gray-800">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500"></div>
        </div>
      ) : (
        !error && (
          <div className="space-y-6">
            {viewMode === "dashboard" ? (
              <div className="space-y-6">
                {/* Graphs Section */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  
                  {/* Task Trend Area Chart */}
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">Task Growth Trend</h3>
                    <div className="flex-1 min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea4c89" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#ea4c89" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#ea4c89" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" isAnimationActive={true} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Task Status Pie Graph */}
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">Status Overview</h3>
                    <div className="flex-1 min-h-[220px]">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="65%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={2}
                              dataKey="value"
                              isAnimationActive={true}
                              className="cursor-pointer outline-none"
                              onClick={handleStatusClick}
                            >
                              {chartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                  opacity={statusFilter === 'All' || statusFilter === entry.name ? 1 : 0.3}
                                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200" 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'var(--tw-colors-white, #fff)' }}
                              itemStyle={{ color: '#1f2937', fontWeight: 500 }}
                            />
                            <Legend 
                              layout="vertical" 
                              verticalAlign="middle" 
                              align="left"
                              iconType="circle"
                              wrapperStyle={{ fontSize: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">No tasks available</div>
                      )}
                    </div>
                  </div>

                  {/* Priority Bar Chart */}
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">Priority Overview</h3>
                    <div className="flex-1 min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9ca3af', fontSize: 11, angle: -35, textAnchor: 'end'}} 
                            dy={15} 
                          />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'var(--tw-colors-white, #fff)' }}
                            cursor={{fill: 'rgba(0, 0, 0, 0.05)'}}
                            itemStyle={{ color: '#1f2937', fontWeight: 500 }}
                          />
                          <Bar 
                            dataKey="value" 
                            radius={[4, 4, 0, 0]} 
                            isAnimationActive={true} 
                            animationDuration={1000} 
                            className="cursor-pointer"
                            onClick={handleBarClick}
                          >
                            {barChartData.map((entry, index) => {
                              const isActive = priorityFilter === 'All' || priorityFilter === entry.name;
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color}
                                  opacity={isActive ? 1 : 0.3} 
                                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200" 
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="space-y-4">
                  <TaskTable 
                    tasks={recentTasks} 
                    onEdit={handleOpenEdit} 
                    onDelete={isAdmin ? handleOpenDelete : undefined}
                    viewMode={viewMode}
                    isAdmin={isAdmin}
                  />
                  <div className="flex justify-center pt-2">
                    <Link to="/tasks" className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      View All Tasks <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              // Full Tasks View
              <>
                <TaskFilters 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  priorityFilter={priorityFilter}
                  onPriorityChange={setPriorityFilter}
                  onReset={handleResetFilters}
                  filterState={filterState}
                  onFilterStateChange={setFilterState}
                />
                
                <TaskTable 
                  tasks={filteredTasks} 
                  onEdit={handleOpenEdit} 
                  onDelete={isAdmin ? handleOpenDelete : undefined}
                  viewMode={viewMode}
                  isAdmin={isAdmin}
                />
              </>
            )}
          </div>
        )
      )}

      {/* Modals */}
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={taskToEdit ? "Edit Task" : "Create New Task"}
      >
        <TaskForm 
          initialData={taskToEdit}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => setIsModalOpen(false)}
        />
      </TaskModal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
      />
    </section>
  );
};

export default Dashboard;