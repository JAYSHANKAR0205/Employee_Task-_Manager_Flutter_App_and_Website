/**
 * @file CreateUser.tsx
 * @description Admin Create User Page Component.
 * 
 * WORK OF THIS FILE:
 * - Allows Admins to pre-register new employee accounts by email (`POST /api/auth/admin-create-user`).
 * - Generates temporary credentials and dispatches ing email invitations.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Enables Administrators to manually invite and provision employee accounts into the portal.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { formatName, validateFirstName, validateLastName, formatEmail, validateEmail } from '../../../utils/validation';
import { safeNavigateBack } from '../../../utils/navigation';

const CreateUser: React.FC = () => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; lastName?: string; email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFirstNameChange = (val: string) => {
    const formatted = formatName(val, false);
    setFormData(prev => ({ ...prev, firstName: formatted }));
    const v = validateFirstName(formatted);
    setFieldErrors(prev => ({ ...prev, firstName: v.isValid ? undefined : v.error }));
  };

  const handleLastNameChange = (val: string) => {
    const formatted = formatName(val, true);
    setFormData(prev => ({ ...prev, lastName: formatted }));
    const v = validateLastName(formatted);
    setFieldErrors(prev => ({ ...prev, lastName: v.isValid ? undefined : v.error }));
  };

  const handleEmailChange = (val: string) => {
    const formatted = formatEmail(val);
    setFormData(prev => ({ ...prev, email: formatted }));
    const v = validateEmail(formatted);
    setFieldErrors(prev => ({ ...prev, email: v.isValid ? undefined : v.error }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fnVal = validateFirstName(formData.firstName);
    const lnVal = validateLastName(formData.lastName);
    const emVal = validateEmail(formData.email);

    if (!fnVal.isValid || !lnVal.isValid || !emVal.isValid) {
      setFieldErrors({
        firstName: fnVal.isValid ? undefined : fnVal.error,
        lastName: lnVal.isValid ? undefined : lnVal.error,
        email: emVal.isValid ? undefined : emVal.error
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/admin-create-user', formData);
      const msg = response.data.message || 'User created successfully! An email has been sent.';
      toast.success(msg);
      setFormData({ firstName: '', lastName: '', email: '' });
      setFieldErrors({});
    } catch (error: any) {
      let errorMessage = 'Failed to create user.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.validationErrors) {
        const firstErrorKey = Object.keys(error.response.data.validationErrors)[0];
        errorMessage = error.response.data.validationErrors[firstErrorKey];
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="p-6 sm:p-8 lg:p-10 space-y-8 relative max-w-[1600px] mx-auto">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => safeNavigateBack(navigate, '/employees')}
            aria-label="Go back"
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create New User</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          The user will receive an email with a temporary password to complete their profile setup.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              First Name *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${fieldErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-[#ea4c89]'} bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors`}
              placeholder="Enter user's first name"
            />
            {fieldErrors.firstName && (
              <p className="mt-2 text-sm text-red-500 font-medium">{fieldErrors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${fieldErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-[#ea4c89]'} bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors`}
              placeholder="Enter user's last name"
            />
            {fieldErrors.lastName && (
              <p className="mt-2 text-sm text-red-500 font-medium">{fieldErrors.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-[#ea4c89]'} bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors`}
              placeholder="Enter user's email"
            />
            {fieldErrors.email && (
              <p className="mt-2 text-sm text-red-500 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            {isLoading ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default CreateUser;
