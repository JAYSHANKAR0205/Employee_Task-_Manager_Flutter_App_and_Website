/**
 * @file EditProfileModal.tsx
 * @description Enterprise User Profile Form & Modal Component.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../contexts/ToastContext';
import { X, Upload, Loader2, User, Check, Trash2, AlertCircle } from 'lucide-react';
import PhoneInput, { getCountryCallingCode, Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../../styles/phone-input.css';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../CustomSelect';
import CustomCountrySelect from '../CustomCountrySelect';
import { getCountryMaxLength } from '../../utils/countryPhoneLengths';
import CustomDatePicker, { parseDateStr } from '../CustomDatePicker';
import { formatName, validateLastName, validateFirstName, formatEmail, validateEmail, validatePhoneNumber, validateBio } from '../../utils/validation';
import { usePersistentTimer } from '../../hooks/usePersistentTimer';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
  targetUser?: any;
  isAdminEdit?: boolean;
  onSuccess?: () => void;
}

const CustomInput = React.forwardRef<HTMLInputElement, any>((props, ref) => {
  let displayValue = (props.value || '').replace(/\s+/g, '');
  const countryCode = props['data-countrycode'];

  if (displayValue && countryCode) {
    const prefix = `+${countryCode}`;
    if (displayValue.startsWith(prefix)) {
      displayValue = displayValue.substring(prefix.length);
    }
  } else if (displayValue && displayValue.startsWith('+')) {
    displayValue = displayValue.replace(/^\+\d{1,4}/, '');
  }

  // Remove any leading zeros that may have been stored from legacy data or autofill
  displayValue = displayValue.replace(/^0+/, '');

  const { maxLength: _ignored, 'data-countrycode': _ignored2, ...finalProps } = props;
  return <input {...finalProps} ref={ref} value={displayValue} />;
});

export const formatDateCustom = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? parseDateStr(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return '';
  }
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  isInline = false, 
  targetUser, 
  isAdminEdit = false,
  onSuccess
}) => {
  const { user, checkAuth, setUser } = useAuth();
  const currentUser = targetUser || user;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    qualification: 'Graduation',
    bio: '',
  });

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Verification States
  const [emailVerified, setEmailVerified] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [emailOtpSent, setEmailOtpSent] = useState(() => sessionStorage.getItem('edit_profile_email_otp_sent') === 'true');
  const [phoneOtpSent, setPhoneOtpSent] = useState(() => sessionStorage.getItem('edit_profile_phone_otp_sent') === 'true');

  useEffect(() => {
    sessionStorage.setItem('edit_profile_email_otp_sent', emailOtpSent.toString());
  }, [emailOtpSent]);

  useEffect(() => {
    sessionStorage.setItem('edit_profile_phone_otp_sent', phoneOtpSent.toString());
  }, [phoneOtpSent]);
  const [emailOtp, setEmailOtp] = useState(() => sessionStorage.getItem('edit_profile_email_otp_input') || '');
  const [phoneOtp, setPhoneOtp] = useState(() => sessionStorage.getItem('edit_profile_phone_otp_input') || '');

  useEffect(() => {
    sessionStorage.setItem('edit_profile_email_otp_input', emailOtp);
  }, [emailOtp]);

  useEffect(() => {
    sessionStorage.setItem('edit_profile_phone_otp_input', phoneOtp);
  }, [phoneOtp]);
  const [verifyLoading, setVerifyLoading] = useState<'email' | 'phone' | null>(null);
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  
  const { timeLeft: otpTimer, startTimer: startOtpTimer } = usePersistentTimer('edit_profile_otp_timer', 60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCountry, setSelectedCountry] = useState<Country>('US');
  const selectedCountryRef = useRef<Country>('US');

  const modalInitializedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      modalInitializedRef.current = false;
      return;
    }

    if (currentUser && isOpen && !modalInitializedRef.current) {
      modalInitializedRef.current = true;
      const formattedDob = currentUser.dateOfBirth ? formatDateCustom(currentUser.dateOfBirth) : '';

      const rawPhone = currentUser.phoneNumber || '';
      let detectedCountry: Country = (currentUser.countryCode as Country) || 'IN';

      if (!currentUser.countryCode && rawPhone && rawPhone.startsWith('+')) {
        const commonCountries: Country[] = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'DE', 'FR', 'IT', 'ES', 'BR', 'MX', 'RU', 'CN', 'JP', 'KR', 'PK', 'BD', 'NP', 'LK'];
        for (const c of commonCountries) {
          try {
            const cCode = '+' + getCountryCallingCode(c);
            if (rawPhone.startsWith(cCode)) {
              detectedCountry = c;
              break;
            }
          } catch (e) {}
        }
      }
      setSelectedCountry(detectedCountry);
      selectedCountryRef.current = detectedCountry;

      // Clean initial phone number so it contains exact national digits after country code
      const callingCode = getCountryCallingCode(detectedCountry);
      const prefix = '+' + callingCode;
      let cleanPhone = rawPhone;
      if (cleanPhone.startsWith(prefix)) {
        let national = cleanPhone.slice(prefix.length).replace(/\D/g, '').replace(/^0+/, '');
        cleanPhone = national ? prefix + national : prefix;
      } else if (cleanPhone.startsWith('+')) {
        let national = cleanPhone.replace(/^\+\d{1,4}/, '').replace(/\D/g, '').replace(/^0+/, '');
        cleanPhone = national ? prefix + national : prefix;
      } else if (cleanPhone) {
        let national = cleanPhone.replace(/\D/g, '').replace(/^0+/, '');
        cleanPhone = national ? prefix + national : prefix;
      }

      setFormData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phoneNumber: cleanPhone,
        dateOfBirth: formattedDob,
        gender: currentUser.gender || 'Male',
        qualification: currentUser.qualification || 'Graduation',
        bio: currentUser.bio || '',
      });

      setProfilePic(currentUser.profilePicture || null);

      const activeOtpType = sessionStorage.getItem('edit_profile_otp_type');
      const pendingPhone = sessionStorage.getItem('edit_profile_pending_phone');
      const pendingEmail = sessionStorage.getItem('edit_profile_pending_email');

      if (activeOtpType) {
        if (activeOtpType === 'phone' && pendingPhone) {
          setFormData(prev => ({ ...prev, phoneNumber: pendingPhone }));
          setPhoneVerified(false);
          setPhoneOtpSent(true);
        } else if (activeOtpType === 'email' && pendingEmail) {
          setFormData(prev => ({ ...prev, email: pendingEmail }));
          setEmailVerified(false);
          setEmailOtpSent(true);
        }
      } else {
        setEmailVerified(true);
        setPhoneVerified(true);
        setEmailOtpSent(false);
        setPhoneOtpSent(false);
        setEmailOtp('');
        setPhoneOtp('');
        setEmailVerificationToken(null);
        setPhoneVerificationToken(null);
        setErrors({});
      }
    }
  }, [currentUser?._id, isOpen]);

  if (!isOpen) return null;

  const handleCountrySelect = (newCountry: string) => {
    const country = newCountry as Country;
    if (country && !phoneVerified && !isEmailChanging) {
      selectedCountryRef.current = country;
      setSelectedCountry(country);
      const code = '+' + getCountryCallingCode(country);
      let cleanNational = (formData.phoneNumber || '').replace(/^\+\d{1,4}/, '').replace(/\D/g, '');
      cleanNational = cleanNational.replace(/^0+/, '');
      const maxLen = getCountryMaxLength(country);
      if (cleanNational.length > maxLen) {
        cleanNational = cleanNational.slice(0, maxLen);
      }
      setFormData(prev => ({ ...prev, phoneNumber: cleanNational ? code + cleanNational : code }));
      setErrors(prev => ({ ...prev, phoneNumber: '' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Please upload a valid image format (JPG, JPEG, PNG, WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must not exceed 2 MB.');
      setErrors(prev => ({ ...prev, profilePic: 'Image size must not exceed 2 MB.' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Pic = reader.result as string;
      setProfilePic(base64Pic);
      setErrors(prev => ({ ...prev, profilePic: '' }));
    };
    reader.readAsDataURL(file);
  };

  const validateField = (name: string, value: string, _currentData: typeof formData) => {
    if (!value && name !== 'bio') {
      const fieldNames: Record<string, string> = {
        firstName: 'First Name', lastName: 'Last Name', email: 'Email Address',
        phoneNumber: 'Phone Number', dateOfBirth: 'Date of Birth', qualification: 'Qualification'
      };
      return `Please enter your ${fieldNames[name] || name}.`;
    }

    switch (name) {
      case 'firstName':
        const { isValid: isFirstValid, error: firstError } = validateFirstName(value);
        return isFirstValid ? '' : (firstError || '');
      case 'lastName':
        const { isValid: isLastValid, error: lastError } = validateLastName(value);
        return isLastValid ? '' : (lastError || '');
      case 'email':
        const { isValid: isEmailValid, error: emailError } = validateEmail(value);
        return isEmailValid ? '' : (emailError || '');
      case 'phoneNumber':
        const activeCountry = selectedCountryRef.current || selectedCountry;
        const { isValid: isPhoneValid, error: phoneError } = validatePhoneNumber(value, activeCountry);
        return isPhoneValid ? '' : (phoneError || '');
      case 'dateOfBirth':
        if (!value) return 'Please enter your date of birth.';
        const dateObj = parseDateStr(value);
        if (!dateObj || isNaN(dateObj.getTime())) return 'Please enter valid date of birth (e.g. 22 Jan 2026).';
        if (dateObj > new Date()) return 'Date of Birth cannot be in the future.';
        return '';
      case 'bio':
        return validateBio(value).isValid ? '' : (validateBio(value).error || '');
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;

    if (name === 'firstName') {
      value = formatName(value.slice(0, 50), false);
    }
    if (name === 'lastName') {
      value = formatName(value.slice(0, 50), true);
    }
    if (name === 'email') {
      value = formatEmail(value);
    }
    if (name === 'bio') {
      value = value.slice(0, 200);
    }

    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    const error = validateField(name, value, newData);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSendInlineOtp = async (type: 'email' | 'phone') => {
    setVerifyLoading(type);
    try {
      if (type === 'email') {
        const dest = currentUser?.phoneNumber || formData.phoneNumber;
        if (!dest) {
          setErrors(prev => ({ ...prev, email: 'A registered phone number is required to receive verification OTP.' }));
          return;
        }
        const res = await api.post('/auth/send-verification-otp', {
          type: 'phone',
          identifier: dest,
          isCrossValidation: true,
          newEmail: formData.email
        });
        const secs = res.data?.remainingSeconds || (res.data?.expiresAt ? Math.ceil((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000) : 60);
        setEmailOtpSent(true);
        setErrors(prev => ({ ...prev, email: '' }));
        sessionStorage.setItem('edit_profile_otp_type', 'email');
        sessionStorage.setItem('edit_profile_pending_email', formData.email);
        startOtpTimer(secs);
      } else {
        const dest = currentUser?.email || formData.email;
        if (!dest) {
          setErrors(prev => ({ ...prev, phoneNumber: 'A registered email address is required to receive verification OTP.' }));
          return;
        }
        const res = await api.post('/auth/send-verification-otp', {
          type: 'email',
          identifier: dest,
          isCrossValidation: true,
          newPhone: formData.phoneNumber
        });
        const secs = res.data?.remainingSeconds || (res.data?.expiresAt ? Math.ceil((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000) : 60);
        setPhoneOtpSent(true);
        setErrors(prev => ({ ...prev, phoneNumber: '' }));
        sessionStorage.setItem('edit_profile_otp_type', 'phone');
        sessionStorage.setItem('edit_profile_pending_phone', formData.phoneNumber);
        startOtpTimer(secs);
      }
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const msg = resData.error || `This email is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`;
        toast.error(msg);
        setErrors(prev => ({ ...prev, [type === 'email' ? 'email' : 'phoneNumber']: msg }));
        return;
      }
      setErrors(prev => ({ ...prev, [type === 'email' ? 'email' : 'phoneNumber']: err.response?.data?.error || `Failed to send verification OTP` }));
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleVerifyInlineOtp = async (type: 'email' | 'phone') => {
    const currentOtp = type === 'email' ? emailOtp : phoneOtp;
    if (!currentOtp || currentOtp.length !== 6) return;

    setVerifyLoading(type);
    try {
      if (type === 'email') {
        const dest = currentUser?.phoneNumber || formData.phoneNumber;
        const response = await api.post('/auth/verify-inline-otp', { type: 'phone', identifier: dest, otp: emailOtp });
        setEmailVerified(true);
        setEmailVerificationToken(response.data.verificationToken);
        setErrors(prev => ({ ...prev, email: '' }));
      } else {
        const dest = currentUser?.email || formData.email;
        const response = await api.post('/auth/verify-inline-otp', { type: 'email', identifier: dest, otp: phoneOtp });
        setPhoneVerified(true);
        setPhoneVerificationToken(response.data.verificationToken);
        setErrors(prev => ({ ...prev, phoneNumber: '' }));
      }
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const msg = resData.error || `This email is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`;
        toast.error(msg);
        setErrors(prev => ({ ...prev, [type === 'email' ? 'email' : 'phoneNumber']: msg }));
        return;
      }
      setErrors(prev => ({ ...prev, [type === 'email' ? 'email' : 'phoneNumber']: err.response?.data?.error || 'Invalid OTP' }));
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatEmail(e.target.value);
    setFormData(prev => ({ ...prev, email: val }));
    const err = validateField('email', val, { ...formData, email: val });
    setErrors(prev => ({ ...prev, email: err }));

    if (user && val.toLowerCase() !== user.email.toLowerCase()) {
      setEmailVerified(false);
      setEmailVerificationToken(null);
      setEmailOtpSent(false);
      setEmailOtp('');
    } else {
      setEmailVerified(true);
      setEmailVerificationToken(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    const firstErr = validateField('firstName', formData.firstName, formData);
    if (firstErr) newErrors.firstName = firstErr;

    const lastErr = validateField('lastName', formData.lastName, formData);
    if (lastErr) newErrors.lastName = lastErr;

    const emailErr = validateField('email', formData.email, formData);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validateField('phoneNumber', formData.phoneNumber, formData);
    if (phoneErr) newErrors.phoneNumber = phoneErr;

    const dobErr = validateField('dateOfBirth', formData.dateOfBirth, formData);
    if (dobErr) newErrors.dateOfBirth = dobErr;

    const bioErr = validateField('bio', formData.bio, formData);
    if (bioErr) newErrors.bio = bioErr;

    if (!formData.qualification) newErrors.qualification = 'Qualification is required';
    
    if (!emailVerified) newErrors.email = 'Please verify your new email address.';
    if (!phoneVerified) newErrors.phoneNumber = 'Please verify your new phone number.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      let updated = false;

      // Convert date string (e.g. 22 Jan 2026) to YYYY-MM-DD ISO format for backend
      let isoDob = formData.dateOfBirth;
      const dateObj = parseDateStr(formData.dateOfBirth);
      if (dateObj && !isNaN(dateObj.getTime())) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        isoDob = `${y}-${m}-${d}`;
      }

      const payload = {
        ...formData,
        dateOfBirth: isoDob,
        profilePic,
        ...(emailVerificationToken && { emailVerificationToken }),
        ...(phoneVerificationToken && { phoneVerificationToken })
      };

      let responseData: any = null;
      if (isAdminEdit && targetUser) {
        const res = await api.put(`/users/${targetUser._id}`, payload);
        responseData = res.data;
        updated = true;
      } else {
        try {
          const res = await api.put('/auth/profile', payload);
          responseData = res.data;
          updated = true;
        } catch (err1: any) {
          try {
            const res = await api.put('/users/profile', payload);
            responseData = res.data;
            updated = true;
          } catch (err2: any) {
            throw err1;
          }
        }
      }

      if (updated) {
        if (!isAdminEdit) {
          const backendCloudinaryPic = responseData?.user?.profilePicture || responseData?.profilePicture;
          const finalPic = backendCloudinaryPic !== undefined ? backendCloudinaryPic : (profilePic ? profilePic : '');
          setUser(prev => prev ? { ...prev, ...formData, profilePicture: finalPic } : null);
          await checkAuth();
        }
        toast.success('Profile updated successfully!');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const errMsg = 'Failed to update profile. Please try again.';
        setErrors({ global: errMsg });
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update profile. Please try again.';
      setErrors({ global: errMsg });
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailChanging = Boolean(currentUser?.email && formData.email.trim().toLowerCase() !== currentUser.email.trim().toLowerCase());
  const isPhoneChanging = Boolean(currentUser?.phoneNumber && formData.phoneNumber.trim() !== currentUser.phoneNumber.trim());

  const inputClass = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all ${
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
        : 'border-gray-300 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30'
    }`;

  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5";

  const getInitials = () => {
    const f = formData.firstName ? formData.firstName.trim().charAt(0).toUpperCase() : '';
    const l = formData.lastName ? formData.lastName.trim().charAt(0).toUpperCase() : '';
    return (f + l) || 'AU';
  };

  const content = (
    <div className={`relative w-full overflow-visible ${isInline ? '' : 'max-w-xl my-6 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-gray-800'}`}>
      
      {!isInline && (
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${isInline ? 'p-2 sm:p-4' : 'p-6 max-h-[80vh] overflow-y-auto custom-scrollbar'} space-y-5`}>
          
          {errors.global && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-sm font-semibold border border-red-200 dark:border-red-800/50">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
              <span>{errors.global}</span>
            </div>
          )}

          {/* Profile Picture Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200/80 dark:border-gray-800">
            <div className="w-20 h-20 rounded-full bg-[#ea4c89] text-white font-black text-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm ring-2 ring-gray-200 dark:ring-slate-700">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials()
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Profile Photo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Supported file: JPG, JPEG, PNG, WEBP (Max 2 MB)</p>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <label 
                  htmlFor="modal-profile-pic"
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={14} /> Upload Picture
                </label>
                <input
                  id="modal-profile-pic"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {profilePic && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setProfilePic(null);
                      setErrors(prev => ({ ...prev, profilePic: '' }));
                    }} 
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              {errors.profilePic && <p className="text-xs text-red-500 font-semibold mt-1">{errors.profilePic}</p>}
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <input
                type="text"
                name="firstName"
                maxLength={50}
                value={formData.firstName}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key.length === 1 && !/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                className={inputClass(!!errors.firstName)}
                placeholder="e.g. John"
              />
              {errors.firstName && <p className="text-xs text-red-500 font-semibold mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className={labelClass}>Last Name *</label>
              <input
                type="text"
                name="lastName"
                maxLength={50}
                value={formData.lastName}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return; if (!/^[a-zA-Z\s\-']$/.test(e.key)) { e.preventDefault(); return; } const input = e.currentTarget; const cursorStart = input.selectionStart || 0; const value = input.value; if ((e.key === ' ' || e.key === '-' || e.key === "'") && cursorStart === 0) { e.preventDefault(); return; } if (e.key === ' ' && cursorStart > 0 && value[cursorStart - 1] === ' ') { e.preventDefault(); } }}
                className={inputClass(!!errors.lastName)}
                placeholder="e.g. Doe"
              />
              {errors.lastName && <p className="text-xs text-red-500 font-semibold mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Single-field change warning banners */}
          {isEmailChanging && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold">
              Phone number cannot be changed while updating email address.
            </div>
          )}
          {isPhoneChanging && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold">
              Email address cannot be changed while updating phone number.
            </div>
          )}

          {/* Email Input */}
          <div className="w-full flex flex-col gap-1.5">
            <label className={labelClass}>Email Address *</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleEmailChange} 
                disabled={isPhoneChanging || emailOtpSent}
                placeholder="Email Address *" 
                className={inputClass(!!errors.email) + " flex-1 disabled:opacity-50 disabled:cursor-not-allowed"} 
              />
              {!emailVerified ? (
                <button 
                  type="button" 
                  onClick={() => handleSendInlineOtp('email')} 
                  disabled={isPhoneChanging || verifyLoading === 'email' || !formData.email || !!errors.email || emailOtpSent} 
                  className="px-4 py-2.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:opacity-90 whitespace-nowrap transition-all cursor-pointer shadow-sm"
                >
                  {verifyLoading === 'email' ? 'Sending...' : 'Verify'}
                </button>
              ) : (
                <div className="flex items-center justify-center px-3.5 bg-green-600 text-white rounded-xl shadow-sm">
                  <Check size={18} />
                </div>
              )}
            </div>
            {emailOtpSent && !emailVerified && (
              <div className="flex flex-col gap-2 mt-1.5 p-3.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-xs font-semibold text-[#ea4c89]">
                  Enter 6-digit OTP sent to registered phone number ({currentUser?.phoneNumber || formData.phoneNumber})
                </span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="Enter Phone OTP" 
                    value={emailOtp} 
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    className={inputClass(false) + " flex-1"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => handleVerifyInlineOtp('email')} 
                    disabled={verifyLoading === 'email' || emailOtp.length !== 6} 
                    className="px-4 py-2 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:opacity-90 whitespace-nowrap transition-all cursor-pointer shadow-sm"
                  >
                    Confirm
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSendInlineOtp('email')} 
                    disabled={verifyLoading === 'email' || otpTimer > 0} 
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-slate-600 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend'}
                  </button>
                </div>
              </div>
            )}
            {errors.email && <span className="text-red-500 text-xs font-semibold block">{errors.email}</span>}
          </div>
          
          {/* Phone Input */}
          <div className="w-full flex flex-col gap-1.5">
            <label className={labelClass}>Phone Number *</label>
            <div className="flex gap-2">
              <div className={inputClass(!!errors.phoneNumber) + " !p-0 flex items-center flex-1 " + (isEmailChanging || phoneOtpSent ? "opacity-50 pointer-events-none" : "")}>
                <div className="pl-2 pr-4 w-full h-[42px] flex items-center">
                  <PhoneInput
                    country={selectedCountry}
                    international={false}
                    withCountryCallingCode={false}
                    onCountryChange={(newC) => {
                      if (newC && !phoneVerified && !isEmailChanging) {
                        handleCountrySelect(newC);
                      }
                    }}
                    limitMaxLength={false}
                    inputComponent={CustomInput}
                    countrySelectComponent={CustomCountrySelect}
                    value={formData.phoneNumber}
                    disabled={isLoading || isEmailChanging || phoneOtpSent}
                    onChange={(value) => {
                      if (isEmailChanging) return;
                      if (phoneVerified) {
                        setPhoneVerified(false);
                        setPhoneVerificationToken(null);
                        setPhoneOtpSent(false);
                        setPhoneOtp('');
                      }
                      
                      let finalVal = value || '';
                      const activeCountry = selectedCountryRef.current || selectedCountry;
                      if (activeCountry) {
                        const code = '+' + getCountryCallingCode(activeCountry);
                        const digits = finalVal.replace(/\D/g, '');
                        const callingCodeDigits = getCountryCallingCode(activeCountry);
                        let nationalDigits = digits;
                        if (digits.startsWith(callingCodeDigits)) {
                          nationalDigits = digits.slice(callingCodeDigits.length);
                        }
                        if (nationalDigits.startsWith('0')) {
                          nationalDigits = nationalDigits.replace(/^0+/, '');
                        }
                        const maxLen = getCountryMaxLength(activeCountry);
                        if (nationalDigits.length > maxLen) {
                          nationalDigits = nationalDigits.slice(0, maxLen);
                        }
                        finalVal = nationalDigits ? code + nationalDigits : code;
                      }
                      
                      setFormData(prev => ({ ...prev, phoneNumber: finalVal }));
                      const { isValid, error } = validatePhoneNumber(finalVal, activeCountry);
                      setErrors(prev => ({ ...prev, phoneNumber: isValid ? '' : (error || '') }));
                      if (user && finalVal === user.phoneNumber) {
                        setPhoneVerified(true);
                      }
                    }}
                    className="w-full h-full flex items-center text-sm font-medium text-gray-900 dark:text-white outline-none bg-transparent"
                    numberInputProps={{ 
                      "data-countrycode": selectedCountryRef.current ? getCountryCallingCode(selectedCountryRef.current) : (selectedCountry ? getCountryCallingCode(selectedCountry) : '1'),
                      id: "phoneNumber", 
                      name: "phoneNumber", 
                      autoComplete: "tel",
                      placeholder: "Phone Number *", 
                      disabled: isLoading || isEmailChanging || phoneOtpSent,
                      onKeyDown: (e: any) => {
                        if (e.key === ' ' || e.code === 'Space') {
                          e.preventDefault();
                          return;
                        }
                        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;
                        const isDigitKey = /^\d$/.test(e.key);
                        if (!isDigitKey) {
                          e.preventDefault();
                          return;
                        }
                        const currentDigits = e.currentTarget.value.replace(/\D/g, '');
                        if (currentDigits.length === 0 && e.key === '0') {
                          e.preventDefault();
                          return;
                        }
                        const maxLength = getCountryMaxLength(selectedCountry);
                        if (currentDigits.length >= maxLength) {
                          e.preventDefault();
                        }
                      },
                      onInput: (e: any) => {
                        let val = e.currentTarget?.value || '';
                        val = val.replace(/\s+/g, '');
                        if (val) {
                          const activeCountry = selectedCountryRef.current || selectedCountry;
                          const code = '+' + getCountryCallingCode(activeCountry);
                          const digits = val.replace(/\D/g, '');
                          const callingCodeDigits = getCountryCallingCode(activeCountry);
                          let nationalDigits = digits;
                          if (digits.startsWith(callingCodeDigits)) {
                            nationalDigits = digits.slice(callingCodeDigits.length);
                          }
                          if (nationalDigits.startsWith('0')) {
                            nationalDigits = nationalDigits.replace(/^0+/, '');
                          }
                          const maxLen = getCountryMaxLength(activeCountry);
                          if (nationalDigits.length > maxLen) {
                            nationalDigits = nationalDigits.slice(0, maxLen);
                          }
                          const formatted = nationalDigits ? code + nationalDigits : code;
                          setFormData(prev => ({ ...prev, phoneNumber: formatted }));
                          const { isValid, error } = validatePhoneNumber(formatted, activeCountry);
                          setErrors(prev => ({ ...prev, phoneNumber: isValid ? '' : (error || '') }));
                        }
                      },
                      onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
                        e.preventDefault();
                        const pastedText = (e.clipboardData.getData('text') || '').replace(/\s+/g, '');
                        let cleanDigits = pastedText.replace(/\D/g, '');
                        if (!cleanDigits) return;
                        const activeCountry = selectedCountryRef.current || selectedCountry;
                        const code = '+' + getCountryCallingCode(activeCountry);
                        const currentDigits = (formData.phoneNumber || '').replace(/^\+\d{1,4}/, '').replace(/\D/g, '');
                        let combinedDigits = (currentDigits + cleanDigits).replace(/^0+/, '');
                        const maxLen = getCountryMaxLength(activeCountry);
                        if (combinedDigits.length > maxLen) {
                          combinedDigits = combinedDigits.slice(0, maxLen);
                        }
                        const formatted = code + combinedDigits;
                        setFormData(prev => ({ ...prev, phoneNumber: formatted }));
                        const { isValid, error } = validatePhoneNumber(formatted, activeCountry);
                        setErrors(prev => ({ ...prev, phoneNumber: isValid ? '' : (error || '') }));
                      },
                      className: "flex-1 w-full h-full placeholder-gray-400 bg-transparent min-w-0 border-none outline-none focus:ring-0" 
                    }}
                  />
                </div>
              </div>
              {!phoneVerified ? (
                <button 
                  type="button" 
                  onClick={() => handleSendInlineOtp('phone')} 
                  disabled={isEmailChanging || verifyLoading === 'phone' || !formData.phoneNumber || !!errors.phoneNumber || !validatePhoneNumber(formData.phoneNumber, selectedCountryRef.current || selectedCountry).isValid || phoneOtpSent} 
                  className="px-4 py-2.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:opacity-90 whitespace-nowrap transition-all cursor-pointer shadow-sm"
                >
                  {verifyLoading === 'phone' ? 'Sending...' : 'Verify'}
                </button>
              ) : (
                <div className="flex items-center justify-center px-3.5 bg-green-600 text-white rounded-xl shadow-sm">
                  <Check size={18} />
                </div>
              )}
            </div>
            {phoneOtpSent && !phoneVerified && (
              <div className="flex flex-col gap-2 mt-1.5 p-3.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-xs font-semibold text-[#ea4c89]">
                  Enter 6-digit OTP sent to registered email address ({currentUser?.email || formData.email})
                </span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="Enter Email OTP" 
                    value={phoneOtp} 
                    onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    className={inputClass(false) + " flex-1"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => handleVerifyInlineOtp('phone')} 
                    disabled={verifyLoading === 'phone' || phoneOtp.length !== 6} 
                    className="px-4 py-2 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:opacity-90 whitespace-nowrap transition-all cursor-pointer shadow-sm"
                  >
                    Confirm
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSendInlineOtp('phone')} 
                    disabled={verifyLoading === 'phone' || otpTimer > 0} 
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-slate-600 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend'}
                  </button>
                </div>
              </div>
            )}
            {errors.phoneNumber && <span className="text-red-500 text-xs font-semibold block">{errors.phoneNumber}</span>}
          </div>

          {/* Date of Birth & Qualification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <CustomDatePicker
                value={formData.dateOfBirth}
                onChange={(dateStr) => {
                  setFormData(prev => ({ ...prev, dateOfBirth: dateStr }));
                  const err = validateField('dateOfBirth', dateStr, { ...formData, dateOfBirth: dateStr });
                  setErrors(prev => ({ ...prev, dateOfBirth: err }));
                }}
                onBlur={() => {
                  const err = validateField('dateOfBirth', formData.dateOfBirth, formData);
                  setErrors(prev => ({ ...prev, dateOfBirth: err }));
                }}
                placeholder="Date of Birth (22 Jan 2026) *"
                disabled={isLoading}
                hasError={!!errors.dateOfBirth}
                placement="top"
                disableFuture={true}
              />
              {errors.dateOfBirth && <span className="text-red-500 text-xs font-semibold block mt-1">{errors.dateOfBirth}</span>}
            </div>

            <div>
              <label className={labelClass}>Qualification *</label>
              <div className={inputClass(!!errors.qualification) + " !p-0 h-[42px]"}>
                <CustomSelect
                  name="qualification"
                  options={['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other']}
                  value={formData.qualification}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, qualification: e.target.value }));
                    setErrors(prev => ({ ...prev, qualification: e.target.value ? '' : 'Qualification is required' }));
                  }}
                  placeholder="Select qualification *"
                />
              </div>
              {errors.qualification && <span className="text-red-500 text-xs font-semibold block mt-1">{errors.qualification}</span>}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className={labelClass}>Gender *</label>
            <div className="flex gap-4 pt-1">
              {['Male', 'Female', 'Other'].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="modalGender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="accent-blue-600 w-4 h-4"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className={labelClass}>Bio (Optional)</label>
            <div className="relative">
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={200}
                value={formData.bio}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  const input = e.currentTarget;
                  if (input.value.length >= 200 && input.selectionStart === input.selectionEnd && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    return;
                  }
                  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;
                  if (!/^[a-zA-Z0-9\s,.\-()]$/.test(e.key)) {
                    e.preventDefault();
                    return;
                  }
                  if (e.key === ' ') {
                    const cursorStart = input.selectionStart || 0;
                    const value = input.value;
                    if (cursorStart === 0 || (cursorStart > 0 && value[cursorStart - 1] === ' ')) {
                      e.preventDefault();
                    }
                  }
                }}
                onPaste={(e) => {
                  const pasteText = e.clipboardData.getData('text') || '';
                  if (!/^[a-zA-Z0-9\s,.\-()]*$/.test(pasteText) || /\s{2,}/.test(pasteText)) {
                    e.preventDefault();
                    const cleaned = pasteText.replace(/[^a-zA-Z0-9\s,.\-()]/g, '').replace(/\s{2,}/g, ' ');
                    if (cleaned) {
                      document.execCommand('insertText', false, cleaned.slice(0, 200 - (formData.bio || '').length));
                    }
                  }
                }}
                placeholder="Tell us a little bit about yourself..."
                className={`${inputClass(!!errors.bio)} resize-none pr-16`}
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-semibold pointer-events-none select-none">
                {(formData.bio || '').length}/200 characters
              </span>
            </div>
            {errors.bio && <span className="text-red-500 text-xs font-semibold block mt-1">{errors.bio}</span>}
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !emailVerified || !phoneVerified}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </div>

      </form>
    </div>
  );

  if (isInline) return content;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in cursor-pointer"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl my-auto animate-in fade-in zoom-in-95">
        {content}
      </div>
    </div>,
    document.body
  );
};

export default EditProfileModal;


