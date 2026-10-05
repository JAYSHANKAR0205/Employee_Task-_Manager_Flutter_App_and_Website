/**
 * @file UserList.tsx
 * @description All Users / Employees Management Page Component (Admin Only).
 * 
 * WORK OF THIS FILE:
 * - Displays a full-width data table listing all registered employee accounts.
 * - Allows Admins to search members, change user roles (Employee <-> Admin), toggle block status (`isBlocked`), and permanently delete accounts.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Provides the primary administration screen for managing community members and permissions.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, GraduationCap, Trash2, Ban, Eye, X, Plus, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { formatName, validateFirstName, validateLastName, formatEmail, validateEmail } from '../../../utils/validation';
import { safeNavigateBack } from '../../../utils/navigation';
import SearchInput from '../../tasks/components/SearchInput';
import MultiSelectDropdown from '../../../components/ui/MultiSelectDropdown';
import FilterPanel from '../../../components/ui/FilterPanel';
import ActiveFilterChips from '../../../components/ui/ActiveFilterChips';
import BadgePill from '../../../components/ui/BadgePill';

const EMPLOYEE_STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Blocked', value: 'Blocked' },
  { label: 'Pending Setup', value: 'Pending Setup' },
];

const EMPLOYEE_ROLE_OPTIONS = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Employee', value: 'Employee' },
];
import { FilterState, FilterGroupConfig, INITIAL_FILTER_STATE } from '../../../types/filter';
import { isWithinDateRange } from '../../../utils/filterUtils';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useActionFeedback } from '../../../hooks/useActionFeedback';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode?: string;
  dateOfBirth: string;
  gender: string;
  qualification: string;
  isVerified: boolean;
  isProfileComplete?: boolean;
  isCreatedByAdmin?: boolean;
  role?: string;
  isBlocked?: boolean;
  bio?: string;
  profilePicture?: string;
  createdAt: string;
}

const formatDateCustom = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

const EMPLOYEE_FILTER_GROUPS: FilterGroupConfig[] = [
  {
    id: 'status',
    label: 'Account Status',
    options: [
      { label: 'Active', value: 'Active' },
      { label: 'Blocked', value: 'Blocked' },
      { label: 'Pending Setup', value: 'Pending Setup' },
    ],
  },
  {
    id: 'role',
    label: 'User Role',
    options: [
      { label: 'Admin', value: 'Admin' },
      { label: 'Employee', value: 'Employee' },
    ],
  },
];

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserModal, setSelectedUserModal] = useState<User | null>(null);

  const [filterState, setFilterState] = useState<FilterState>(() => {
    try {
      const saved = sessionStorage.getItem('employees_filter_state');
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
    sessionStorage.setItem('employees_filter_state', JSON.stringify(filterState));
    setCurrentPage(1);
  }, [filterState]);

  // Create Employee Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({ firstName: '', lastName: '', email: '' });
  const [createErrors, setCreateErrors] = useState<{ firstName?: string; lastName?: string; email?: string }>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete User Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const actionFeedback = useActionFeedback();

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const handleCreateFirstNameChange = (val: string) => {
    const formatted = formatName(val, false);
    setCreateFormData(prev => ({ ...prev, firstName: formatted }));
    const v = validateFirstName(formatted);
    setCreateErrors(prev => ({ ...prev, firstName: v.isValid ? undefined : v.error }));
  };

  const handleCreateLastNameChange = (val: string) => {
    const formatted = formatName(val, true);
    setCreateFormData(prev => ({ ...prev, lastName: formatted }));
    const v = validateLastName(formatted);
    setCreateErrors(prev => ({ ...prev, lastName: v.isValid ? undefined : v.error }));
  };

  const handleCreateEmailChange = (val: string) => {
    const formatted = formatEmail(val);
    setCreateFormData(prev => ({ ...prev, email: formatted }));
    const v = validateEmail(formatted);
    setCreateErrors(prev => ({ ...prev, email: v.isValid ? undefined : v.error }));
  };

  const handleCreateEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fnVal = validateFirstName(createFormData.firstName);
    const lnVal = validateLastName(createFormData.lastName);
    const emVal = validateEmail(createFormData.email);

    if (!fnVal.isValid || !lnVal.isValid || !emVal.isValid) {
      setCreateErrors({
        firstName: fnVal.isValid ? undefined : fnVal.error,
        lastName: lnVal.isValid ? undefined : lnVal.error,
        email: emVal.isValid ? undefined : emVal.error
      });
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError('');
    try {
      const res = await api.post('/auth/admin-create-user', {
        firstName: createFormData.firstName,
        lastName: createFormData.lastName,
        email: createFormData.email
      });
      showToast(res.data?.message || `Credentials sent to ${createFormData.email}`);
      setIsCreateModalOpen(false);
      setCreateFormData({ firstName: '', lastName: '', email: '' });
      setCreateErrors({});
      // Refresh user list
      const { data } = await api.get('/auth/all');
      setUsers(data);
      if (res.data?.user?._id) {
        actionFeedback.markAdded(res.data.user._id);
      }
    } catch (err: any) {
      let msg = 'Failed to create employee.';
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err.response?.data?.validationErrors) {
        const firstKey = Object.keys(err.response.data.validationErrors)[0];
        msg = err.response.data.validationErrors[firstKey];
      }
      setCreateError(msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleBlockUser = async (id: string) => {
    actionFeedback.markPending(id);
    try {
      const res = await api.put(`/users/${id}/block`);
      const newBlockedState = res.data?.user?.isBlocked ?? true;
      setUsers(users.map(u => u._id === id ? { ...u, isBlocked: newBlockedState } : u));
      actionFeedback.markUpdated(id);
      showToast(`User ${newBlockedState ? 'Blocked' : 'Unblocked'} Successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to toggle block status');
    } finally {
      actionFeedback.clearPending(id);
    }
  };

  const openDeleteConfirmModal = (u: User) => {
    setUserToDelete(u);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete._id;
    actionFeedback.triggerDeleteWithAnimation(targetId, async () => {
      try {
        await api.delete(`/users/${targetId}`);
        setUsers(prev => prev.filter(u => u._id !== targetId));
        if (selectedUserModal?._id === targetId) {
          setSelectedUserModal(null);
        }
        showToast('User deleted successfully');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to delete user');
      } finally {
        setUserToDelete(null);
        setIsDeleteConfirmOpen(false);
      }
    });
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/auth/all');
        setUsers(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to fetch users. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  const getInitials = (u: User) => {
    const f = u.firstName ? u.firstName[0] : (u.email ? u.email[0].toUpperCase() : 'U');
    const l = u.lastName ? u.lastName[0] : '';
    return `${f}${l}`;
  };

  const getDisplayName = (u: User) => {
    let name = '';
    if (u.firstName || u.lastName) {
      name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    } else {
      name = u.email || 'User';
    }
    if (name.length > 20) {
      return name.slice(0, 20) + '...';
    }
    return name;
  };

  const getUserStatus = (u: User): string => {
    if (u.isBlocked) return 'Blocked';
    if (!u.isProfileComplete || !u.isVerified) return 'Pending Setup';
    return 'Active';
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    const email = u.email ? u.email.toLowerCase() : '';
    const qual = u.qualification ? u.qualification.toLowerCase() : '';
    const term = searchTerm.toLowerCase();
    if (term && !fullName.includes(term) && !email.includes(term) && !qual.includes(term)) {
      return false;
    }

    if (!isWithinDateRange(u.createdAt, filterState)) {
      return false;
    }

    const selectedStatuses = filterState.multiSelects['status'] || [];
    if (selectedStatuses.length > 0) {
      const userStatus = getUserStatus(u);
      if (!selectedStatuses.includes(userStatus)) return false;
    }

    const selectedRoles = filterState.multiSelects['role'] || [];
    if (selectedRoles.length > 0) {
      const userRole = u.role || 'Employee';
      if (!selectedRoles.includes(userRole)) return false;
    }

    return true;
  });

  // Apply Date Sort
  if (filterState.sortDate === 'newest') {
    filteredUsers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } else if (filterState.sortDate === 'oldest') {
    filteredUsers.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  // Apply Alphabetical Sort
  if (filterState.sortAlphabetical === 'a-z') {
    filteredUsers.sort((a, b) => {
      const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
      const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } else if (filterState.sortAlphabetical === 'z-a') {
    filteredUsers.sort((a, b) => {
      const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
      const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
      return nameB.localeCompare(nameA);
    });
  }

  // Pagination State (10 users per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (selectedUserModal || isCreateModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedUserModal, isCreateModalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 relative max-w-[1600px] mx-auto font-sans text-gray-900 dark:text-white">
      {/* Page Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => safeNavigateBack(navigate, '/dashboard')}
            aria-label="Go back"
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and manage all registered employee accounts.
            </p>
          </div>
        </div>
        {currentUser?.role === 'Admin' && (
          <button
            onClick={() => {
              setCreateError('');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#ea4c89] to-[#a855f7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 cursor-pointer"
          >
            <Plus size={16} />
            Create Employee
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900 dark:border dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search members by name, email, or qualification..."
        />
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Dedicated Filter Button */}
          <MultiSelectDropdown
            label="Status"
            options={EMPLOYEE_STATUS_OPTIONS}
            selectedValues={filterState.multiSelects['status'] || []}
            onChange={(newSelected) => {
              setFilterState((prev) => ({
                ...prev,
                multiSelects: {
                  ...prev.multiSelects,
                  status: newSelected,
                },
              }));
            }}
          />

          {/* Role Dedicated Filter Button */}
          <MultiSelectDropdown
            label="Role"
            options={EMPLOYEE_ROLE_OPTIONS}
            selectedValues={filterState.multiSelects['role'] || []}
            onChange={(newSelected) => {
              setFilterState((prev) => ({
                ...prev,
                multiSelects: {
                  ...prev.multiSelects,
                  role: newSelected,
                },
              }));
            }}
          />

          {/* Custom Filter Panel (Date & Sorting) */}
          <FilterPanel
            filterState={filterState}
            onApplyFilters={(newState) => setFilterState(newState)}
            onClearFilters={() => setFilterState(INITIAL_FILTER_STATE)}
            filterGroups={[]}
            dateFieldLabel="Joined Date"
          />
        </div>
      </div>

      {/* Removable Active Filter Chips */}
      <ActiveFilterChips
        filterState={filterState}
        groups={EMPLOYEE_FILTER_GROUPS}
        onRemoveMultiSelect={(groupId, val) => {
          setFilterState((prev) => ({
            ...prev,
            multiSelects: {
              ...prev.multiSelects,
              [groupId]: (prev.multiSelects[groupId] || []).filter((v) => v !== val),
            },
          }));
        }}
        onRemoveDateFilter={() => setFilterState((prev) => ({ ...prev, datePreset: 'all', fromDate: '', toDate: '' }))}
        onRemoveAlphabeticalSort={() => setFilterState((prev) => ({ ...prev, sortAlphabetical: 'none' }))}
        onRemoveDateSort={() => setFilterState((prev) => ({ ...prev, sortDate: 'none' }))}
        onClearAll={() => setFilterState(INITIAL_FILTER_STATE)}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Data Table Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm transition-colors duration-300 dark:bg-slate-900 dark:border dark:border-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Member Directory
          </h2>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            {filteredUsers.length} Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 rounded-tl-lg whitespace-nowrap">Creative</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Contact</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Details</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Education</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Role</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 rounded-tr-lg whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-16 text-center text-gray-400">
                      <div className="w-8 h-8 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <span className="font-medium text-sm text-gray-500">Loading creatives...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-16 text-center">
                      <span className="font-medium text-sm text-gray-500">No members found matching "{searchTerm}"</span>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      key={user._id} 
                      className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-all duration-300 group ${actionFeedback.getItemAnimationClass(user._id)}`}
                    >
                      {/* User Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-900 dark:text-white font-bold text-xs shrink-0 overflow-hidden">
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={getDisplayName(user)} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(user)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{getDisplayName(user)}</p>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                              {user.createdAt ? `Joined ${formatDateCustom(user.createdAt)}` : 'Joined recently'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {user.email || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {user.countryCode || ''} {user.phoneNumber || 'N/A'}
                          </div>
                        </div>
                      </td>

                      {/* Demographics Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">{user.gender || 'N/A'}</p>
                        <p className="text-xs font-medium text-gray-500">
                          {formatDateCustom(user.dateOfBirth)}
                        </p>
                      </td>

                      {/* Qualification Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                          {user.qualification || 'None'}
                        </div>
                      </td>

                      {/* Role Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.role === 'Admin' ? (
                          <BadgePill label="Admin" variant="purple" />
                        ) : (
                          <BadgePill label="Employee" variant="blue" />
                        )}
                      </td>

                      {/* Status Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.isBlocked ? (
                          <BadgePill label="Blocked" variant="red" />
                        ) : (user.isCreatedByAdmin && user.isProfileComplete === false) ? (
                          <BadgePill label="Pending" variant="amber" />
                        ) : (
                          <BadgePill label="Active" variant="green" />
                        )}
                      </td>

                      {/* Actions Cell */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {/* Eye Button to View User Details */}
                          <button
                            onClick={() => setSelectedUserModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            title="View User Details"
                          >
                            <Eye size={18} />
                          </button>

                          {currentUser?.role === 'Admin' && user.role !== 'Admin' && (
                            <>
                              <button
                                onClick={() => handleBlockUser(user._id)}
                                className={`p-2 rounded-lg transition cursor-pointer ${
                                  user.isBlocked 
                                    ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' 
                                    : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                }`}
                                title={user.isBlocked ? "Unblock User" : "Block User"}
                              >
                                <Ban size={18} />
                              </button>
                              <button
                                onClick={() => openDeleteConfirmModal(user)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredUsers.length > itemsPerPage && (
            <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
              <div>
                Showing <span className="font-bold text-gray-900 dark:text-white">{startIndex + 1}</span> to{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.min(startIndex + itemsPerPage, filteredUsers.length)}
                </span>{" "}
                of <span className="font-bold text-gray-900 dark:text-white">{filteredUsers.length}</span> users
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
        </div>

      {/* User Details Modal */}
      {selectedUserModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Full-screen backdrop overlay covering sidebar, header, and entire window */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in cursor-pointer" 
            onClick={() => setSelectedUserModal(null)} 
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm overflow-hidden shrink-0">
                  {selectedUserModal.profilePicture ? (
                    <img src={selectedUserModal.profilePicture} alt={selectedUserModal.firstName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    `${(selectedUserModal.firstName || '').charAt(0).toUpperCase()}${(selectedUserModal.lastName || '').charAt(0).toUpperCase()}` || 'U'
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedUserModal.firstName} {selectedUserModal.lastName}
                  </h3>
                  <span className="text-xs font-medium text-gray-500">{selectedUserModal.email}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserModal(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedUserModal.isBlocked ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  Blocked
                  </span>
                ) : (selectedUserModal.isCreatedByAdmin && selectedUserModal.isProfileComplete === false) ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Pending
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Active
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  Role: {selectedUserModal.role || 'Employee'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {selectedUserModal.isVerified ? 'Verified User' : 'Unverified User'}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-2 text-gray-700 dark:text-gray-300">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Phone Number</p>
                  <p className="font-medium mt-0.5">{selectedUserModal.countryCode || ''} {selectedUserModal.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Gender</p>
                  <p className="font-medium capitalize mt-0.5">{selectedUserModal.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Qualification</p>
                  <p className="font-medium mt-0.5">{selectedUserModal.qualification || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Date of Birth</p>
                  <p className="font-medium mt-0.5">{formatDateCustom(selectedUserModal.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Joined Date</p>
                  <p className="font-medium mt-0.5">{formatDateCustom(selectedUserModal.createdAt)}</p>
                </div>
              </div>

              {/* Bio */}
              {selectedUserModal.bio && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Bio</p>
                  <p className="font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl mt-1 text-xs border border-gray-100 dark:border-slate-800">
                    {selectedUserModal.bio}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4 dark:border-gray-800">
              {currentUser?.role === 'Admin' && selectedUserModal.role !== 'Admin' && (
                <button
                  onClick={() => {
                    handleBlockUser(selectedUserModal._id);
                    setSelectedUserModal(prev => prev ? { ...prev, isBlocked: !prev.isBlocked } : null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedUserModal.isBlocked 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {selectedUserModal.isBlocked ? 'Unblock User' : 'Block User'}
                </button>
              )}
              <button
                onClick={() => setSelectedUserModal(null)}
                className="ml-auto rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Employee Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Full-screen backdrop overlay covering sidebar, header, and entire window */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in cursor-pointer" 
            onClick={() => setIsCreateModalOpen(false)} 
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ea4c89]/10 text-[#ea4c89] flex items-center justify-center font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Employee</h3>
                  <p className="text-xs font-medium text-gray-500">Send login credentials via email</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="mt-4 space-y-4">
              {createError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.firstName}
                  onChange={(e) => handleCreateFirstNameChange(e.target.value)}
                  placeholder="Enter first name"
                  className={`w-full px-4 py-3 rounded-xl border ${createErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800 focus:ring-[#ea4c89]'} bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                />
                {createErrors.firstName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.lastName}
                  onChange={(e) => handleCreateLastNameChange(e.target.value)}
                  placeholder="Enter last name"
                  className={`w-full px-4 py-3 rounded-xl border ${createErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800 focus:ring-[#ea4c89]'} bg-[#1a1a1a]/0 bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                />
                {createErrors.lastName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => handleCreateEmailChange(e.target.value)}
                  placeholder="enter.email@example.com"
                  className={`w-full px-4 py-3 rounded-xl border ${createErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800 focus:ring-[#ea4c89]'} bg-gray-50 dark:bg-[#1a1a1a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                />
                {createErrors.email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{createErrors.email}</p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="rounded-xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCreate ? 'Sending...' : 'Send Mail'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete ? getDisplayName(userToDelete) : ''}"? This action cannot be undone.`}
        confirmText="Delete User"
      />
    </div>
  );
};

export default UserList;
