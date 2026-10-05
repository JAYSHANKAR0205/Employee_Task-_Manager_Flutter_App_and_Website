import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import api from '../../../services/api';
import { AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, Check, ArrowLeft } from 'lucide-react';
import PhoneInput, { getCountryCallingCode, Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../../../styles/phone-input.css';
import CustomCountrySelect from '../../../components/CustomCountrySelect';
import CustomSelect from '../../../components/CustomSelect';
import { formatName, validateLastName, validateFirstName, formatEmail, validateEmail, validatePhoneNumber, validateBio } from '../../../utils/validation';
import { getCountryMaxLength } from '../../../utils/countryPhoneLengths';
import { usePersistentTimer } from '../../../hooks/usePersistentTimer';
import CustomDatePicker, { parseDateStr } from '../../../components/CustomDatePicker';
import TermsModal from '../../../components/TermsModal';
import PrivacyModal from '../../../components/PrivacyModal';
import { useAuth } from '../../../contexts/AuthContext';
import ThemeToggle from '../../../components/ThemeToggle';
import { useToast } from '../../../contexts/ToastContext';
import { safeNavigateBack } from '../../../utils/navigation';

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

  const { maxLength: _ignored, 'data-countrycode': _ignored2, ...finalProps } = props;
  return <input {...finalProps} ref={ref} value={displayValue} />;
});

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkAuth } = useAuth();
  const { toast } = useToast();
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [blockTimerFormatted, setBlockTimerFormatted] = useState<string>('');
  const googleData = location.state?.googleData;
  const isFromLogin = location.state?.isFromLogin;
  const isFromAdminCreate = location.state?.isFromAdminCreate;

  useEffect(() => {
    if (!googleData && !user) {
      navigate('/login');
    } else if (googleData) {
      if (isFromLogin) {
        setGlobalMessage({
          type: 'warning',
          text: 'You are not an existing user. Please complete your profile to register.'
        });
      } else {
        setGlobalMessage({
          type: 'info',
          text: 'Please enter your all details.'
        });
      }
    }
  }, [googleData, user, isFromLogin, navigate]);

  const [formData, setFormData] = useState({
    firstName: googleData?.firstName || user?.firstName || '',
    lastName: googleData?.lastName || user?.lastName || '',
    email: googleData?.email || user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    qualification: user?.qualification || '',
    bio: user?.bio || '',
    googleId: googleData?.googleId || user?.googleId || '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user && !googleData) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        phoneNumber: user.phoneNumber || prev.phoneNumber,
        dateOfBirth: user.dateOfBirth || prev.dateOfBirth,
        gender: user.gender || prev.gender,
        qualification: user.qualification || prev.qualification,
        bio: user.bio || prev.bio,
      }));
    }
  }, [user]);

  
  const [emailVerified, setEmailVerified] = useState(() => sessionStorage.getItem('complete_profile_email_verified') === 'true');
  const [phoneVerified, setPhoneVerified] = useState(() => sessionStorage.getItem('complete_profile_phone_verified') === 'true');
  const [emailOtpSent, setEmailOtpSent] = useState(() => {
    const savedTarget = sessionStorage.getItem('complete_profile_otp_email_target');
    return !!savedTarget;
  });
  const [phoneOtpSent, setPhoneOtpSent] = useState(() => {
    const savedTarget = sessionStorage.getItem('complete_profile_otp_phone_target');
    return !!savedTarget;
  });
  const [emailOtp, setEmailOtp] = useState(() => sessionStorage.getItem('complete_profile_email_otp_input') || '');
  const [phoneOtp, setPhoneOtp] = useState(() => sessionStorage.getItem('complete_profile_phone_otp_input') || '');

  useEffect(() => {
    sessionStorage.setItem('complete_profile_email_otp_input', emailOtp);
  }, [emailOtp]);

  useEffect(() => {
    sessionStorage.setItem('complete_profile_phone_otp_input', phoneOtp);
  }, [phoneOtp]);
  const [emailVerificationToken, setEmailVerificationToken] = useState(() => sessionStorage.getItem('complete_profile_email_token') || '');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(() => sessionStorage.getItem('complete_profile_phone_token') || '');
  const [verifyLoading, setVerifyLoading] = useState<'email' | 'phone' | null>(null);

  const { timeLeft: emailTimerLeft, startTimer: startEmailTimer, resetTimer: resetEmailTimer } = usePersistentTimer('complete_profile_email_otp_timer', 60);
  const { timeLeft: phoneTimerLeft, startTimer: startPhoneTimer, resetTimer: resetPhoneTimer } = usePersistentTimer('complete_profile_phone_otp_timer', 60);

  const otpEmailTargetRef = useRef<string>(sessionStorage.getItem('complete_profile_otp_email_target') || '');
  const otpPhoneTargetRef = useRef<string>(sessionStorage.getItem('complete_profile_otp_phone_target') || '');

  useEffect(() => {
    const target = sessionStorage.getItem('complete_profile_otp_email_target') || otpEmailTargetRef.current;
    if (formData.email && target && formData.email === target) {
      setEmailOtpSent(true);
    }
  }, [formData.email]);

  useEffect(() => {
    const target = sessionStorage.getItem('complete_profile_otp_phone_target') || otpPhoneTargetRef.current;
    if (formData.phoneNumber && target && formData.phoneNumber === target) {
      setPhoneOtpSent(true);
    }
  }, [formData.phoneNumber]);

  useEffect(() => {
    if (googleData || isFromAdminCreate) {
      setEmailVerified(true);
    }
  }, [googleData, isFromAdminCreate]);

  useEffect(() => {
    const emailKey = formData.email ? formData.email.toLowerCase().trim() : '';
    const phoneKey = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : '';
    if (!emailKey && !phoneKey) {
      setBlockedUntil(null);
      setBlockTimerFormatted('');
      return;
    }

    const savedBlock = sessionStorage.getItem(`register_block_${emailKey}_${phoneKey}`);
    const blockTs = savedBlock ? parseInt(savedBlock, 10) : null;

    if (blockTs && blockTs > Date.now()) {
      setBlockedUntil(blockTs);
    } else {
      if (savedBlock) {
        sessionStorage.removeItem(`register_block_${emailKey}_${phoneKey}`);
      }
      setBlockedUntil(null);
      setBlockTimerFormatted('');
    }
  }, [formData.email, formData.phoneNumber]);

  useEffect(() => {
    if (!blockedUntil) return;

    const updateTimer = () => {
      const remainingMs = blockedUntil - Date.now();
      if (remainingMs <= 0) {
        const emailKey = formData.email ? formData.email.toLowerCase().trim() : '';
        const phoneKey = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : '';
        if (emailKey || phoneKey) {
          sessionStorage.removeItem(`register_block_${emailKey}_${phoneKey}`);
        }
        setBlockedUntil(null);
        setBlockTimerFormatted('');
        return;
      }
      const totalSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      const mins = Math.max(1, Math.ceil(totalSecs / 60));
      const timerStr = `${mins} minute${mins > 1 ? 's' : ''}`;
      setBlockTimerFormatted(timerStr);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil, formData.email, formData.phoneNumber]);

  const handleSendInlineOtp = async (type: 'email' | 'phone') => {
    const value = type === 'email' ? formData.email : formData.phoneNumber;
    if (!value) {
      setErrors(prev => ({ ...prev, [type === 'email' ? 'email' : 'phoneNumber']: 'Required to send OTP' }));
      return;
    }

    if (blockedUntil && blockedUntil > Date.now()) {
      const remainingMins = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
      const entityLabel = type === 'email' ? 'email' : 'phone number';
      const msg = `This ${entityLabel} is temporarily blocked. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`;
      toast.error(msg);
      setGlobalMessage({ type: 'error', text: msg });
      return;
    }
    
    let formattedPhone = value;
    if (type === 'phone') {
      const activeCountry = selectedCountryRef.current || selectedCountry;
      const countryCode = '+' + getCountryCallingCode(activeCountry);
      formattedPhone = (value || '').trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = countryCode + formattedPhone.replace(/\D/g, '');
      }
    }
    
    setVerifyLoading(type);
    setGlobalMessage({ type: '', text: '' });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/send-verification-otp', {
        type,
        identifier: type === 'email' ? value : formattedPhone
      });
      const secs = res.data?.remainingSeconds || (res.data?.expiresAt ? Math.ceil((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000) : 60);
      if (type === 'email') {
        otpEmailTargetRef.current = value;
        sessionStorage.setItem('complete_profile_otp_email_target', value);
        setEmailOtpSent(true);
        startEmailTimer(secs);
      }
      if (type === 'phone') {
        otpPhoneTargetRef.current = formattedPhone;
        sessionStorage.setItem('complete_profile_otp_phone_target', formattedPhone);
        setPhoneOtpSent(true);
        startPhoneTimer(secs);
      }
      setGlobalMessage({ type: 'success', text: `OTP sent to your ${type}!` });
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const bTs = resData.blockedUntil || (Date.now() + (resData.remainingTime || 600) * 1000);
        const emailKey = formData.email ? formData.email.toLowerCase().trim() : '';
        const phoneKey = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : '';
        const lockKey = `register_block_${emailKey}_${phoneKey}`;
        sessionStorage.setItem(lockKey, bTs.toString());
        setBlockedUntil(bTs);
        const entityLabel = type === 'email' ? 'email' : 'phone number';
        const msg = resData.error || `This ${entityLabel} is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`;
        toast.error(msg);
        setGlobalMessage({ type: 'error', text: msg });
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      setGlobalMessage({ type: 'error', text: err.response?.data?.error || `Failed to send ${type} OTP.` });
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleVerifyInlineOtp = async (type: 'email' | 'phone') => {
    const identifier = type === 'email' ? formData.email : formData.phoneNumber;
    const otp = type === 'email' ? emailOtp : phoneOtp;

    if (blockedUntil && blockedUntil > Date.now()) {
      const remainingMins = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
      const entityLabel = type === 'email' ? 'email' : 'phone number';
      const msg = `This ${entityLabel} is temporarily blocked. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`;
      toast.error(msg);
      setGlobalMessage({ type: 'error', text: msg });
      return;
    }
    
    let formattedPhone = identifier;
    if (type === 'phone') {
      const activeCountry = selectedCountryRef.current || selectedCountry;
      const countryCode = '+' + getCountryCallingCode(activeCountry);
      formattedPhone = (identifier || '').trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = countryCode + formattedPhone.replace(/\D/g, '');
      }
    }

    setVerifyLoading(type);
    setGlobalMessage({ type: '', text: '' });
    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-inline-otp', {
        type,
        identifier: type === 'email' ? identifier : formattedPhone,
        otp
      });
      if (type === 'email') {
        setEmailVerified(true);
        setEmailVerificationToken(response.data.verificationToken);
        sessionStorage.setItem('complete_profile_email_verified', 'true');
        sessionStorage.setItem('complete_profile_email_token', response.data.verificationToken);
      } else {
        setPhoneVerified(true);
        setPhoneVerificationToken(response.data.verificationToken);
        sessionStorage.setItem('complete_profile_phone_verified', 'true');
        sessionStorage.setItem('complete_profile_phone_token', response.data.verificationToken);
      }
      setGlobalMessage({ type: 'success', text: `${type} verified successfully!` });
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const bTs = resData.blockedUntil || (Date.now() + (resData.remainingTime || 600) * 1000);
        const emailKey = formData.email ? formData.email.toLowerCase().trim() : '';
        const phoneKey = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : '';
        const lockKey = `register_block_${emailKey}_${phoneKey}`;
        sessionStorage.setItem(lockKey, bTs.toString());
        setBlockedUntil(bTs);
        const entityLabel = type === 'email' ? 'email' : 'phone number';
        const msg = resData.error || `This ${entityLabel} is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`;
        toast.error(msg);
        setGlobalMessage({ type: 'error', text: msg });
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      setGlobalMessage({ type: 'error', text: err.response?.data?.error || `Invalid ${type} OTP.` });
    } finally {
      setVerifyLoading(null);
    }
  };

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>('US');
  const selectedCountryRef = useRef<Country>('US');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setGlobalMessage({ type: 'error', text: 'Profile picture must be less than 2MB' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
      setGlobalMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const validateField = (name: string, value: string) => {
    if (!value && name !== 'bio') {
      const fieldNames: Record<string, string> = {
        firstName: 'First Name', lastName: 'Last Name', email: 'Email Address',
        phoneNumber: 'Phone Number', dateOfBirth: 'Date of Birth',
        qualification: 'Qualification'
      };
      return `Please enter your ${fieldNames[name] || name}.`;
    }
    switch (name) {
      case 'firstName':
        return validateFirstName(value).isValid ? null : validateFirstName(value).error;
      case 'lastName':
        return validateLastName(value).isValid ? null : validateLastName(value).error;
      case 'email':
        return validateEmail(value).isValid ? null : validateEmail(value).error;
      case 'phoneNumber':
        const activeCountry = selectedCountryRef.current || selectedCountry;
        const { isValid: isPhoneValid, error: phoneError } = validatePhoneNumber(value, activeCountry);
        return isPhoneValid ? null : phoneError;
      case 'dateOfBirth':
        const date = parseDateStr(value);
        if (!date) return 'Please select a valid date';
        if (date > new Date()) return 'Date cannot be in the future';
        return null;
      case 'bio':
        return validateBio(value).isValid ? null : validateBio(value).error;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'firstName' || name === 'lastName') value = formatName(value, name === 'lastName');
    if (name === 'email') {
      value = formatEmail(value);
      if (value !== otpEmailTargetRef.current) {
        setEmailOtpSent(false);
        setEmailOtp('');
        setEmailVerified(false);
        resetEmailTimer();
        otpEmailTargetRef.current = '';
      }
    }
    if (name === 'bio') value = value.replace(/[^a-zA-Z0-9\s,.\-()]/g, '').replace(/\s{2,}/g, ' ');

    const newData = { ...formData, [name]: value };
    setFormData(newData);
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (!name) return;
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};
    let isValid = true;
    Object.keys(formData).forEach(key => {
      if (key !== 'googleId' && key !== 'password' && key !== 'confirmPassword') {
        const value = formData[key as keyof typeof formData];
        if (key !== 'bio' && !value) {
          const fieldNames: Record<string, string> = {
            firstName: 'First Name', lastName: 'Last Name', email: 'Email Address',
            phoneNumber: 'Phone Number', dateOfBirth: 'Date of Birth',
            qualification: 'Qualification', password: 'Password', confirmPassword: 'Password Confirmation'
          };
          newErrors[key] = `Please enter your ${fieldNames[key] || key}.`;
          isValid = false;
        } else if (key !== 'bio') {
          const error = validateField(key, value as string);
          if (error) {
            newErrors[key] = error;
            isValid = false;
          }
        }
      }
    });

    if (!emailVerified) { newErrors.email = 'Please verify your email address first.'; isValid = false; }
    if (!phoneVerified) { newErrors.phoneNumber = 'Please verify your phone number first.'; isValid = false; }
    
    if (isFromAdminCreate) {
      if (!formData.password) { newErrors.password = 'Password is required'; isValid = false; }
      else if (formData.password.length < 8) { newErrors.password = 'Min 8 chars required'; isValid = false; }
      
      if (!formData.confirmPassword) { newErrors.confirmPassword = 'Confirm password is required'; isValid = false; }
      else if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = 'Passwords do not match'; isValid = false; }
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = { ...formData };

      // Ensure phone number includes country calling code prefix
      const activeCountry = selectedCountryRef.current || selectedCountry;
      const countryCode = '+' + getCountryCallingCode(activeCountry);
      let formattedPhone = (formData.phoneNumber || '').trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = countryCode + formattedPhone.replace(/\D/g, '');
      }
      payload.phoneNumber = formattedPhone;

      const dateObj = parseDateStr(payload.dateOfBirth);
      if (dateObj) {
        payload.dateOfBirth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      }
      
      
      if (isFromAdminCreate) {
        await api.post('/auth/complete-admin-profile', {
          ...payload,
          emailVerificationToken,
          phoneVerificationToken
        });
      } else {
        await axios.post('http://localhost:5000/api/auth/google-register', {
          ...payload,
          phoneVerificationToken
        });
      }

      await checkAuth();
      sessionStorage.removeItem('complete_profile_otp_email_target');
      sessionStorage.removeItem('complete_profile_otp_phone_target');
      sessionStorage.removeItem('complete_profile_email_verified');
      sessionStorage.removeItem('complete_profile_phone_verified');
      sessionStorage.removeItem('complete_profile_email_token');
      sessionStorage.removeItem('complete_profile_phone_token');
      sessionStorage.removeItem('complete_profile_email_otp_timer');
      sessionStorage.removeItem('complete_profile_phone_otp_timer');
      setGlobalMessage({ type: 'success', text: 'Registration successful!' });
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
        setGlobalMessage({ type: 'error', text: 'Please fix the errors below.' });
      } else {
        setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = !!(formData.firstName && formData.lastName && formData.email && formData.phoneNumber && formData.dateOfBirth && formData.gender && formData.qualification && termsAccepted);
  const inputClass = (hasError: boolean) => 
    `w-full px-4 py-3.5 rounded-full border bg-slate-50/70 dark:bg-slate-900/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200/80 dark:border-slate-800/80 focus:border-[#ea4c89]/80 focus:ring-4 focus:ring-[#ea4c89]/10 hover:border-slate-300 dark:hover:border-slate-700'}`;

  if (!googleData && !user) return null;

  return (
    <div className="min-h-screen flex w-full bg-[#fcfcfd] dark:bg-[#0f1117] transition-colors duration-300 relative">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <AnimatePresence>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      </AnimatePresence>
      <div className="w-full flex justify-center p-6 md:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col justify-center items-center font-sans">
          
          <div className="w-full mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => safeNavigateBack(navigate, '/login')}
              aria-label="Go back"
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>

          <div className="w-full text-left mb-6 flex lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Employee Task Manager</h1>
          </div>

          <div className="w-full flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white p-2.5 flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>
            <h2 className="text-[28px] font-black text-gray-900 dark:text-white mb-3">Complete Profile</h2>
            <p className="text-[15px] text-gray-600 dark:text-gray-400 font-medium max-w-sm">You are almost there. Fill in the missing details.</p>
          </div>

          {blockedUntil && blockTimerFormatted ? (
            <div className="w-full p-4 rounded-xl mb-6 text-center text-sm font-semibold border bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
              This contact detail is temporarily blocked. Please try again in {blockTimerFormatted}.
            </div>
          ) : globalMessage.text ? (
            <div className={`w-full p-4 rounded-xl mb-6 text-center text-sm font-medium border ${
              globalMessage.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400' 
                : globalMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300'
                : globalMessage.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300'
                : 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400'
            }`}>
              {globalMessage.text}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm">
            <div className="flex flex-col w-full mb-1">
              <div className="relative self-center">
                <div 
                  className="w-20 h-20 rounded-full border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#111] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222] transition-colors group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profilePic ? (
                    <img src={profilePic} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-bold text-center px-1">Upload</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                Supported file: JPG, JPEG, PNG, WEBP (Max 2 MB)
              </span>
              {profilePic && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setProfilePic(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="mt-2 text-[12px] self-center font-bold text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" strokeWidth={3} /> Remove
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/jpg" className="hidden" />
            </div>

            
            <div className="w-full flex gap-3">
              <div className="flex flex-col flex-1 gap-1.5">
                <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} placeholder="First Name *" disabled={isSubmitting} className={inputClass(!!errors.firstName)} />
                {errors.firstName && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.firstName}</span>}
              </div>
              <div className="flex flex-col flex-1 gap-1.5">
                <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} placeholder="Last Name *" disabled={isSubmitting} className={inputClass(!!errors.lastName)} />
                {errors.lastName && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.lastName}</span>}
              </div>
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <div className="flex gap-2">
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address *" className={inputClass(!!errors.email) + " flex-1"} disabled={isSubmitting || emailVerified || !!(googleData?.email || user?.email)} />
                {!emailVerified ? (
                  <button type="button" onClick={() => handleSendInlineOtp('email')} disabled={verifyLoading === 'email' || !formData.email || !!errors.email} className="px-4 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap shadow-sm cursor-pointer">
                    {verifyLoading === 'email' ? '...' : 'Verify'}
                  </button>
                ) : (
                  <div className="flex items-center justify-center px-4 bg-green-500 text-white rounded-full">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
              {emailOtpSent && !emailVerified && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex gap-2">
                    <input type="text" maxLength={6} placeholder="Enter Email OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputClass(false)} />
                    <button type="button" onClick={() => handleVerifyInlineOtp('email')} disabled={verifyLoading === 'email' || emailOtp.length !== 6} className="px-4 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap shadow-sm cursor-pointer">
                      Confirm
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-2 mt-0.5">
                    {emailTimerLeft > 0 ? (
                      <span className="text-xs font-semibold text-gray-500">Resend OTP in {emailTimerLeft}s</span>
                    ) : (
                      <button type="button" onClick={() => handleSendInlineOtp('email')} disabled={verifyLoading === 'email'} className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#ea4c89] dark:hover:text-[#ea4c89] transition-colors focus:outline-none">
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}
              {errors.email && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.email}</span>}
            </div>
            
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex gap-2">
                <div className={inputClass(!!errors.phoneNumber) + " !p-0 flex items-center flex-1"}>
                    <div className="pl-2 pr-4 w-full h-[50px] flex items-center">
                      <PhoneInput
                        country={selectedCountry}
                        onCountryChange={(country) => {
                          if (country && !phoneVerified) {
                            selectedCountryRef.current = country;
                            setSelectedCountry(country);
                            const code = '+' + getCountryCallingCode(country);
                            const rawDigits = (formData.phoneNumber || '').replace(/^\+\d{1,4}/, '').replace(/\D/g, '');
                            const maxLen = getCountryMaxLength(country);
                            let cleanNational = rawDigits.replace(/^0+/, '');
                            if (cleanNational.length > maxLen) {
                              cleanNational = cleanNational.slice(0, maxLen);
                            }
                            setPhoneOtpSent(false);
                            setPhoneOtp('');
                            setPhoneVerified(false);
                            resetPhoneTimer();
                            otpPhoneTargetRef.current = '';
                            setFormData(prev => ({ ...prev, phoneNumber: cleanNational ? code + cleanNational : code }));
                            setErrors(prev => ({ ...prev, phoneNumber: null }));
                          }
                        }}
                        limitMaxLength={false}
                        inputComponent={CustomInput}
                        countrySelectComponent={CustomCountrySelect}
                        value={formData.phoneNumber}
                        onChange={(value) => {
                          if (phoneVerified) return;
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
                            nationalDigits = nationalDigits.replace(/^0+/, '');
                            finalVal = nationalDigits ? code + nationalDigits : code;
                          }
                          
                          if (finalVal !== otpPhoneTargetRef.current) {
                            setPhoneOtpSent(false);
                            setPhoneOtp('');
                            setPhoneVerified(false);
                            resetPhoneTimer();
                            otpPhoneTargetRef.current = '';
                          }
                          
                          setFormData(prev => ({ ...prev, phoneNumber: finalVal }));
                          const activeCountryCode = selectedCountryRef.current || selectedCountry;
                          const code = activeCountryCode ? '+' + getCountryCallingCode(activeCountryCode) : '';
                          if (finalVal && finalVal !== code) {
                            const { isValid, error } = validatePhoneNumber(finalVal, activeCountryCode);
                            setErrors(prev => ({ ...prev, phoneNumber: isValid ? null : error }));
                          } else {
                            setErrors(prev => ({ ...prev, phoneNumber: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!formData.phoneNumber) {
                            setErrors(prev => ({ ...prev, phoneNumber: 'Please enter your Phone Number.' }));
                          } else {
                            const { isValid, error } = validatePhoneNumber(formData.phoneNumber, selectedCountry);
                            setErrors(prev => ({ ...prev, phoneNumber: isValid ? null : error }));
                          }
                        }}
                        className="w-full h-full flex items-center text-[15px] font-medium text-gray-900 dark:text-white outline-none bg-transparent"
                        numberInputProps={{ 
                          "data-countrycode": selectedCountryRef.current ? getCountryCallingCode(selectedCountryRef.current) : (selectedCountry ? getCountryCallingCode(selectedCountry) : '1'),
                          id: "phoneNumber", 
                          name: "phoneNumber", 
                          autoComplete: "tel",
                          placeholder: "Phone Number *", 
                          disabled: phoneVerified || isSubmitting,
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
                            const maxLength = getCountryMaxLength(selectedCountry);
                            const currentDigits = e.currentTarget.value.replace(/\D/g, '');
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
                              const formatted = nationalDigits ? code + nationalDigits : code;
                              setFormData(prev => ({ ...prev, phoneNumber: formatted }));
                              const { isValid, error } = validatePhoneNumber(formatted, activeCountry);
                              setErrors(prev => ({ ...prev, phoneNumber: isValid ? null : error }));
                            }
                          },
                          onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
                            e.preventDefault();
                            const pastedText = (e.clipboardData.getData('text') || '').replace(/\s+/g, '');
                            const cleanDigits = pastedText.replace(/\D/g, '');
                            if (!cleanDigits) return;
                            const activeCountry = selectedCountryRef.current || selectedCountry;
                            const code = '+' + getCountryCallingCode(activeCountry);
                            const currentDigits = (formData.phoneNumber || '').replace(/^\+\d{1,4}/, '').replace(/\D/g, '');
                            const combinedDigits = currentDigits + cleanDigits;
                            const formatted = code + combinedDigits;
                            setFormData(prev => ({ ...prev, phoneNumber: formatted }));
                            const { isValid, error } = validatePhoneNumber(formatted, activeCountry);
                            setErrors(prev => ({ ...prev, phoneNumber: isValid ? null : error }));
                          },
                          className: "flex-1 w-full h-full placeholder-gray-400 dark:placeholder-gray-500 bg-transparent min-w-0 border-none outline-none focus:ring-0" 
                        }}
                      />
                    </div>
                </div>
                {!phoneVerified ? (
                  <button type="button" onClick={() => handleSendInlineOtp('phone')} disabled={verifyLoading === 'phone' || !formData.phoneNumber || !!errors.phoneNumber || formData.phoneNumber.length < 5} className="px-4 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap shadow-sm cursor-pointer">
                    {verifyLoading === 'phone' ? '...' : 'Verify'}
                  </button>
                ) : (
                  <div className="flex items-center justify-center px-4 bg-green-500 text-white rounded-full">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
              {phoneOtpSent && !phoneVerified && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex gap-2">
                    <input type="text" maxLength={6} placeholder="Enter Phone OTP" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputClass(false)} />
                    <button type="button" onClick={() => handleVerifyInlineOtp('phone')} disabled={verifyLoading === 'phone' || phoneOtp.length !== 6} className="px-4 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap shadow-sm cursor-pointer">
                      Confirm
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-2 mt-0.5">
                    {phoneTimerLeft > 0 ? (
                      <span className="text-xs font-semibold text-gray-500">Resend OTP in {phoneTimerLeft}s</span>
                    ) : (
                      <button type="button" onClick={() => handleSendInlineOtp('phone')} disabled={verifyLoading === 'phone'} className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#ea4c89] dark:hover:text-[#ea4c89] transition-colors focus:outline-none">
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}
              {errors.phoneNumber && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.phoneNumber}</span>}
            </div>


            <div className="w-full flex flex-col gap-1.5">
              <CustomDatePicker
              value={formData.dateOfBirth}
              onChange={(dateStr) => {
                setFormData(prev => ({ ...prev, dateOfBirth: dateStr }));
                setErrors(prev => ({ ...prev, dateOfBirth: validateField('dateOfBirth', dateStr) }));
              }}
              onBlur={() => {
                setErrors(prev => ({ ...prev, dateOfBirth: validateField('dateOfBirth', formData.dateOfBirth) }));
              }}
              placeholder="Date of Birth (e.g. 24 Dec 2026) *"
              disabled={isSubmitting}
              hasError={!!errors.dateOfBirth}
              disableFuture={true}
            />
              {errors.dateOfBirth && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.dateOfBirth}</span>}
            </div>
            
            <div className="w-full flex flex-col gap-1.5">
              <div className={`flex items-center justify-between h-[52px] px-4 rounded-full border transition-all ${
                errors.gender 
                  ? 'border-red-400 bg-slate-50/70 dark:bg-slate-900/60' 
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
                {['Male', 'Female', 'Other'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="radio" name="gender" value={option} checked={formData.gender === option} onChange={handleChange} className="peer sr-only" disabled={isSubmitting} />
                      <div className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center ${formData.gender === option ? 'border-[#ea4c89]' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full bg-[#ea4c89] transition-transform duration-200 ${formData.gender === option ? 'scale-100' : 'scale-0'}`}></div>
                      </div>
                    </div>
                    <span className={`text-[14px] font-medium transition-colors ${formData.gender === option ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{option}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.gender}</span>}
            </div>

            <div className="w-full flex flex-col gap-1.5">
                <div className={inputClass(!!errors.qualification) + " !p-0"}>
                  <CustomSelect
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    options={['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other']}
                    placeholder="Select Qualification *"
                    disabled={isSubmitting}
                    onBlur={handleBlur}
                  />
                </div>
                {errors.qualification && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.qualification}</span>}
            </div>
            
            <div className="w-full flex flex-col gap-1.5">
                <div className="relative">
                  <textarea 
                    id="bio" 
                    name="bio" 
                    value={formData.bio} 
                    onChange={handleChange} 
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;
                      if (!/^[a-zA-Z0-9\s,.\-()]$/.test(e.key)) {
                        e.preventDefault();
                        return;
                      }
                      if (e.key === ' ') {
                        const input = e.currentTarget;
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
                          document.execCommand('insertText', false, cleaned);
                        }
                      }
                    }}
                    maxLength={500}
                    placeholder="Bio (Optional)" 
                    className={inputClass(!!errors.bio) + " resize-none h-[52px] py-3.5 pr-20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"} 
                    disabled={isSubmitting} 
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] text-gray-400 font-medium pointer-events-none">
                    {(formData.bio || '').length}/500 words
                  </span>
                </div>
                {errors.bio && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.bio}</span>}
            </div>

            {isFromAdminCreate && (
              <>
                <div className="w-full flex flex-col gap-1.5">
                  <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="New Password *" className={inputClass(!!errors.password)} disabled={isSubmitting} />
                  {errors.password && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.password}</span>}
                </div>
                <div className="w-full flex flex-col gap-1.5">
                  <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm New Password *" className={inputClass(!!errors.confirmPassword)} disabled={isSubmitting} />
                  {errors.confirmPassword && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.confirmPassword}</span>}
                </div>
              </>
            )}


            <div className="flex flex-col gap-6 mt-2">
              <div className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <p className="text-center text-[11px] text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
                    By continuing, you agree to our <button type="button" onClick={() => setShowTerms(true)} className="underline hover:text-gray-900 dark:hover:text-white">Terms</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="underline hover:text-gray-900 dark:hover:text-white">Privacy Policy</button>
                  </p>
                  
                  <label className="flex items-center justify-center gap-2 cursor-pointer group mx-auto">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="peer sr-only" disabled={isSubmitting} />
                    <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 peer-checked:border-gray-900 dark:peer-checked:border-white peer-checked:bg-gray-900 dark:peer-checked:bg-white transition-all flex items-center justify-center">
                      <svg className={`w-3 h-3 text-white dark:text-gray-900 transition-opacity ${termsAccepted ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">I explicitly agree</span>
                  </label>
                  {errors.terms && <span className="text-red-500 text-xs font-semibold text-center block mt-1">{errors.terms}</span>}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid}
                  className="w-full py-3.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[15px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 shadow-md cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
