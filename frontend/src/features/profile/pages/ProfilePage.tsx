/**
 * @file ProfilePage.tsx
 * @description Enterprise User Profile Details & Settings Page.
 * 
 * WORK OF THIS FILE:
 * - Implements a clean, authentic enterprise user profile page.
 * - Displays read-only user details organized in a dual-column layout with sidebar navigation.
 * - Embeds inline editing (`EditProfileModal`) in the edit tab.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import api from "../../../services/api";
import EditProfileModal from "../../../components/ui/EditProfileModal";
import ResetPasswordTab from "../components/ResetPasswordTab";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { 
  User, 
  Edit2, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  ShieldCheck, 
  FileText,
  CheckCircle2,
  KeyRound,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { safeNavigateBack } from "../../../utils/navigation";

const formatDateCustom = (dateStr?: string) => {
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

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'edit' | 'reset-password'>(() => {
    if (sessionStorage.getItem('edit_profile_otp_type')) {
      return 'edit';
    }
    const saved = sessionStorage.getItem('profile_active_tab');
    if (saved === 'edit' || saved === 'reset-password' || saved === 'profile') {
      return saved;
    }
    return 'profile';
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('profile_active_tab', activeTab);
  }, [activeTab]);

  if (!user) return null;

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/auth/account');
      setUser(null);
      localStorage.removeItem('cached_user_profile');
      sessionStorage.clear();
      navigate('/login?account_deleted=true');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete account.');
    }
  };

  const getInitials = () => {
    const f = user.firstName ? user.firstName.trim().charAt(0).toUpperCase() : '';
    const l = user.lastName ? user.lastName.trim().charAt(0).toUpperCase() : '';
    return (f + l) || 'AU';
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 relative max-w-[1600px] mx-auto font-sans text-gray-900 dark:text-white">
      <div className="w-full space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'profile') {
                  setActiveTab('profile');
                } else {
                  safeNavigateBack(navigate, '/dashboard');
                }
              }}
              aria-label="Go back"
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Profile Settings
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                Manage your personal information, contact credentials, and account settings.
              </p>
            </div>
          </div>
        </div>

        {/* Dual Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-gray-200 dark:border-gray-800 shadow-sm space-y-1">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">
                Account Settings
              </p>
              
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'profile' || activeTab === 'edit'
                    ? 'bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <User size={18} />
                Overview
              </button>

              <button
                onClick={() => setActiveTab('reset-password')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'reset-password'
                    ? 'bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <KeyRound size={18} />
                Reset Password
              </button>
            </div>

            {/* Account Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                <ShieldCheck size={16} className="text-[#ea4c89]" />
                Security & Status
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Your account is active and protected with verified contact authentication.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400">
                <CheckCircle2 size={14} />
                <span>Verified Account</span>
              </div>
            </div>

            {/* Danger Zone: Delete Account */}
            {user.role !== 'Admin' && (
              <div className="bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-4 border border-red-200/60 dark:border-red-900/40 space-y-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            )}
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            
            {activeTab === 'profile' && (
              <div className="p-6 sm:p-8 space-y-8">
                
                {/* User Header Summary Card */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-gray-100 dark:border-gray-800/80 pb-6 text-center sm:text-left">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#ea4c89] text-white font-black text-2xl sm:text-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm ring-4 ring-gray-100 dark:ring-slate-800">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      getInitials()
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                          {user.email}
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('edit')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer self-center sm:self-auto"
                      >
                        <Edit2 size={14} /> Edit Profile
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {user.role || 'Employee'}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Verified Member
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Details Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Personal & Contact Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* First Name */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <User size={14} className="text-blue-600 dark:text-blue-400" /> First Name
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user.firstName || 'N/A'}</p>
                    </div>

                    {/* Last Name */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <User size={14} className="text-blue-600 dark:text-blue-400" /> Last Name
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user.lastName || 'N/A'}</p>
                    </div>

                    {/* Email */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <Mail size={14} className="text-blue-600 dark:text-blue-400" /> Email Address
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white break-all">{user.email}</p>
                    </div>

                    {/* Phone Number */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <Phone size={14} className="text-blue-600 dark:text-blue-400" /> Phone Number
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user.phoneNumber || 'N/A'}</p>
                    </div>

                    {/* Date of Birth */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <Calendar size={14} className="text-blue-600 dark:text-blue-400" /> Date of Birth
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDateCustom(user.dateOfBirth)}</p>
                    </div>

                    {/* Gender */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <User size={14} className="text-blue-600 dark:text-blue-400" /> Gender
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{user.gender || 'N/A'}</p>
                    </div>

                    {/* Qualification */}
                    <div className="md:col-span-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        <GraduationCap size={14} className="text-blue-600 dark:text-blue-400" /> Qualification
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user.qualification || 'None'}</p>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                      <div className="md:col-span-2 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          <FileText size={14} className="text-blue-600 dark:text-blue-400" /> Bio
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {user.bio}
                        </p>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            )}

            {activeTab === 'edit' && (
              <div className="p-4 sm:p-6">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile Details</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Update your account information and contact credentials.</p>
                </div>

                <EditProfileModal 
                  isOpen={true} 
                  onClose={() => setActiveTab('profile')} 
                  isInline={true} 
                />
              </div>
            )}

            {activeTab === 'reset-password' && (
              <ResetPasswordTab />
            )}

          </div>
        </div>
      </div>
      {/* Delete Account Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Your Account?"
        message="Are you sure you want to permanently delete your account? Your active profile data and Cloudinary avatars will be deleted from active databases and moved to the secure archive."
        confirmText="Yes, Delete My Account"
      />
    </div>
  );
};

export default ProfilePage;
