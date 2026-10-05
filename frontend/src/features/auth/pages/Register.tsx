import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from 'axios';
import api from '../../../services/api';
import { AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import PhoneInput, { getCountryCallingCode, Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../../../styles/phone-input.css';
import CustomCountrySelect from '../../../components/CustomCountrySelect';
import CustomSelect from '../../../components/CustomSelect';
import { formatName, validateLastName, validateFirstName, formatEmail, validateEmail, validatePhoneNumber, validateBio } from '../../../utils/validation';
import { getCountryMaxLength } from '../../../utils/countryPhoneLengths';
import { usePersistentTimer } from '../../../hooks/usePersistentTimer';
import { encryptPassword } from '../../../utils/crypto';
import CustomDatePicker, { parseDateStr } from '../../../components/CustomDatePicker';
import TermsModal from '../../../components/TermsModal';
import PrivacyModal from '../../../components/PrivacyModal';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

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

interface RegisterProps {
  onSwitch?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitch }) => {
  const { toast } = useToast();
  const DEFAULT_FORM_DATA = {
    firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', dateOfBirth: '', gender: '', qualification: '', bio: ''
  };
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('register_form_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...DEFAULT_FORM_DATA, ...parsed, password: '', confirmPassword: '' };
        }
      }
    } catch (e) {}
    return DEFAULT_FORM_DATA;
  });
  
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>('US');
  const selectedCountryRef = useRef<Country>('US');
  const [currentSlide, setCurrentSlide] = useState(() => {
    const val = parseInt(sessionStorage.getItem('register_current_slide') || '1', 10);
    return isNaN(val) ? 1 : val;
  });

  React.useEffect(() => {
    sessionStorage.setItem('register_current_slide', currentSlide.toString());
  }, [currentSlide]);
  const [emailVerified, setEmailVerified] = useState(() => sessionStorage.getItem('register_email_verified') === 'true');
  const [phoneVerified, setPhoneVerified] = useState(() => sessionStorage.getItem('register_phone_verified') === 'true');
  const [emailOtpSent, setEmailOtpSent] = useState(() => {
    const savedTarget = sessionStorage.getItem('register_otp_email_target');
    return !!savedTarget;
  });
  const [phoneOtpSent, setPhoneOtpSent] = useState(() => {
    const savedTarget = sessionStorage.getItem('register_otp_phone_target');
    return !!savedTarget;
  });
  const [emailOtp, setEmailOtp] = useState(() => sessionStorage.getItem('register_email_otp_input') || '');
  const [phoneOtp, setPhoneOtp] = useState(() => sessionStorage.getItem('register_phone_otp_input') || '');

  React.useEffect(() => {
    sessionStorage.setItem('register_email_otp_input', emailOtp);
  }, [emailOtp]);

  React.useEffect(() => {
    sessionStorage.setItem('register_phone_otp_input', phoneOtp);
  }, [phoneOtp]);
  const [emailVerificationToken, setEmailVerificationToken] = useState(() => sessionStorage.getItem('register_email_token') || '');
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(() => sessionStorage.getItem('register_phone_token') || '');
  const [verifyLoading, setVerifyLoading] = useState<'email' | 'phone' | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [blockTimerFormatted, setBlockTimerFormatted] = useState<string>('');

  const handleCountrySelect = (newCountry: string) => {
    const country = newCountry as Country;
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
      sessionStorage.removeItem('register_otp_phone_target');
      sessionStorage.removeItem('register_phone_verified');
      sessionStorage.removeItem('register_phone_token');
      setFormData((prev: any) => ({ ...prev, phoneNumber: cleanNational ? code + cleanNational : code }));
      setErrors((prev: any) => ({ ...prev, phoneNumber: null }));
    }
  };

  const validateSlide1 = () => {
    let isValid = true;
    const newErrors = { ...errors };

    ['firstName', 'lastName', 'email', 'phoneNumber'].forEach(key => {
      const value = formData[key as keyof typeof formData];
      if (!value) {
        const fieldNames: Record<string, string> = {
          firstName: 'First Name', lastName: 'Last Name', email: 'Email Address', phoneNumber: 'Phone Number'
        };
        newErrors[key] = `Please enter your ${fieldNames[key] || key}.`;
        isValid = false;
      } else {
        const error = validateField(key, value as string, formData, true);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      }
    });

    if (!emailVerified) {
      newErrors.email = 'Please verify your email address first.';
      isValid = false;
    }
    if (!phoneVerified) {
      newErrors.phoneNumber = 'Please verify your phone number first.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  React.useEffect(() => {
    if (formData && typeof formData === 'object') {
      const { password: _p, confirmPassword: _cp, ...safeData } = formData;
      sessionStorage.setItem('register_form_data', JSON.stringify(safeData));
    }
  }, [formData]);

  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const { timeLeft: emailTimerLeft, startTimer: startEmailTimer, resetTimer: resetEmailTimer } = usePersistentTimer('register_email_otp_timer', 60);
  const { timeLeft: phoneTimerLeft, startTimer: startPhoneTimer, resetTimer: resetPhoneTimer } = usePersistentTimer('register_phone_otp_timer', 60);

  const otpEmailTargetRef = useRef<string>(sessionStorage.getItem('register_otp_email_target') || '');
  const otpPhoneTargetRef = useRef<string>(sessionStorage.getItem('register_otp_phone_target') || '');

  React.useEffect(() => {
    const target = sessionStorage.getItem('register_otp_email_target') || otpEmailTargetRef.current;
    if (formData.email && target && formData.email === target) {
      setEmailOtpSent(true);
    }
  }, [formData.email]);

  React.useEffect(() => {
    const target = sessionStorage.getItem('register_otp_phone_target') || otpPhoneTargetRef.current;
    if (formData.phoneNumber && target && formData.phoneNumber === target) {
      setPhoneOtpSent(true);
    }
  }, [formData.phoneNumber]);

  // Sync 10-minute real-time registration lockout
  React.useEffect(() => {
    const emailKey = formData.email ? formData.email.toLowerCase().trim() : '';
    const phoneKey = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : '';
    if (!emailKey && !phoneKey) {
      setBlockedUntil(null);
      setBlockTimerFormatted('');
      return;
    }

    const savedBlock = Cookies.get(`register_block_${emailKey}_${phoneKey}`);
    const blockTs = savedBlock ? parseInt(savedBlock, 10) : null;

    if (blockTs && blockTs > Date.now()) {
      setBlockedUntil(blockTs);
    } else {
      if (savedBlock) {
        Cookies.remove(`register_block_${emailKey}_${phoneKey}`, { path: '/' });
      }
      setBlockedUntil(null);
      setBlockTimerFormatted('');
    }
  }, [formData.email, formData.phoneNumber]);

  React.useEffect(() => {
    if (!blockedUntil) return;

    const updateTimer = () => {
      const remainingMs = blockedUntil - Date.now();
      if (remainingMs <= 0) {
        const emailKey = formData.email ? formData.email.toLowerCase().trim() : '';
        const phoneKey = formData.phoneNumber ? formData.phoneNumber.replace(/\D/g, '') : '';
        if (emailKey || phoneKey) {
          Cookies.remove(`register_block_${emailKey}_${phoneKey}`, { path: '/' });
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setGlobalMessage({ type: 'error', text: 'Image size must not exceed 2 MB.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
      setGlobalMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const validateField = (name: string, value: string, currentData: typeof formData, _isSubmit: boolean = false) => {
    if (!value && name !== 'bio' && name !== 'password' && name !== 'confirmPassword') {
      const fieldNames: Record<string, string> = {
        firstName: 'First Name', lastName: 'Last Name', email: 'Email Address',
        phoneNumber: 'Phone Number', dateOfBirth: 'Date of Birth',
        qualification: 'Qualification'
      };
      return `Please enter your ${fieldNames[name] || name}.`;
    }

    switch (name) {
      case 'firstName':
        const { isValid: isFirstValid, error: firstError } = validateFirstName(value);
        return isFirstValid ? null : firstError;
      case 'lastName':
        const { isValid: isLastValid, error: lastError } = validateLastName(value);
        return isLastValid ? null : lastError;
      case 'email':
        const { isValid: isEmailValid, error: emailError } = validateEmail(value);
        return isEmailValid ? null : emailError;
      case 'phoneNumber':
        const activeCountry = selectedCountryRef.current || selectedCountry;
        const { isValid: isPhoneValid, error: phoneError } = validatePhoneNumber(value, activeCountry);
        return isPhoneValid ? null : phoneError;
      case 'password':
        if (!value) return 'Please enter your password.';
        if (value.length < 8) return 'Please enter min 8 character password.';
        if (!/(?=.*[a-z])/.test(value)) return 'Please enter 1 lower case.';
        if (!/(?=.*[A-Z])/.test(value)) return 'Please enter 1 upper case.';
        if (!/(?=.*\d)/.test(value)) return 'Please enter 1 number.';
        if (!/(?=.*[^A-Za-z0-9])/.test(value)) return 'Please enter 1 special character.';
        return null;
      case 'confirmPassword':
        if (!value) return 'Please confirm your password.';
        if (value !== currentData.password) return 'Passwords do not match.';
        return null;
      case 'dateOfBirth':
        if (!value) return 'Please enter your date of birth.';
        const dateObj = parseDateStr(value);
        if (!dateObj || isNaN(dateObj.getTime())) return 'Please enter valid date of birth (e.g. 22 Jan 2026).';
        if (dateObj > new Date()) return 'Date of Birth cannot be in the future.';
        return null;
      case 'bio':
        return validateBio(value).isValid ? null : validateBio(value).error;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;

    if (name === 'firstName') {
      value = formatName(value.slice(0, 50), false);
    }
    if (name === 'lastName') {
      value = formatName(value.slice(0, 50), true);
    }
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
    if (name === 'bio') {
      value = value.slice(0, 200);
    }

    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    const error = validateField(name, value, newData, false);
    setErrors(prev => ({ ...prev, [name]: error }));

    if (name === 'password' && newData.confirmPassword) {
      const confirmError = validateField('confirmPassword', newData.confirmPassword, newData, false);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const checkAvailability = async (name: string, value: string) => {
    if (!value) return;
    try {
      const payload = name === 'email' ? { email: value } : { phoneNumber: value };
      const res = await axios.post('http://localhost:5000/api/auth/check-email', payload);
      if (res.data.exists) {
        setErrors(prev => ({
          ...prev,
          [name]: res.data.message || `This ${name === 'email' ? 'email address' : 'phone number'} is already exists.`
        }));
      }
    } catch (err) {
      // Ignore network/server errors
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (!name) return;

    if (name === 'bio' && value) {
      const cleaned = value.replace(/[^a-zA-Z0-9\s,.\-()]/g, '').replace(/\s{2,}/g, ' ').trim();
      setFormData((prev: any) => ({ ...prev, bio: cleaned }));
    }

    const error = validateField(name, value, formData, false);
    setErrors((prev: any) => ({ ...prev, [name]: error }));
    if (!error && (name === 'email' || name === 'phoneNumber')) {
      checkAvailability(name, value);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};
    let isValid = true;
    
    Object.keys(formData).forEach(key => {
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
        const error = validateField(key, value as string, formData, true);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      }
    });

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleGoogleAuthSuccess = async (token?: string) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/google-auth', {
        token: token || 'mock_google_token',
        email: formData.email || undefined,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined
      });

      if (response.data.isNewUser) {
        toast.success('Google authentication verified!');
        navigate('/complete-profile', { state: { googleData: response.data.googleData, isFromRegister: true } });
      } else {
        try {
          await checkAuth();
          toast.success('Account already exists. Logged in successfully!');
          navigate('/dashboard');
        } catch (authErr) {
          toast.info('An account with this email already exists. Please log in.');
          navigate('/login');
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Google Signup failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleLoginHandler = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleAuthSuccess(tokenResponse.access_token),
    onError: () => handleGoogleAuthSuccess('mock_google_token')
  });

  const triggerGoogleLogin = () => {
    try {
      googleLoginHandler();
    } catch (e) {
      handleGoogleAuthSuccess('mock_google_token');
    }
  };

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
    try {
      const res = await axios.post('http://localhost:5000/api/auth/send-verification-otp', {
        type,
        identifier: type === 'email' ? value : formattedPhone
      });
      const secs = res.data?.remainingSeconds || (res.data?.expiresAt ? Math.ceil((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000) : 60);
      if (type === 'email') {
        otpEmailTargetRef.current = value;
        sessionStorage.setItem('register_otp_email_target', value);
        setEmailOtpSent(true);
        startEmailTimer(secs);
      }
      if (type === 'phone') {
        otpPhoneTargetRef.current = formattedPhone;
        sessionStorage.setItem('register_otp_phone_target', formattedPhone);
        setPhoneOtpSent(true);
        startPhoneTimer(secs);
      }
      toast.success(`OTP sent to your ${type}!`);
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
      toast.error(err.response?.data?.error || `Failed to send ${type} OTP.`);
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleVerifyInlineOtp = async (type: 'email' | 'phone') => {
    const value = type === 'email' ? formData.email : formData.phoneNumber;
    const currentOtp = type === 'email' ? emailOtp : phoneOtp;
    if (!currentOtp || currentOtp.length !== 6) return;

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
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-inline-otp', {
        type,
        identifier: type === 'email' ? value : formattedPhone,
        otp: currentOtp
      });
      
      if (type === 'email') {
        setEmailVerified(true);
        setEmailVerificationToken(res.data.verificationToken);
        sessionStorage.setItem('register_email_verified', 'true');
        sessionStorage.setItem('register_email_token', res.data.verificationToken);
      } else {
        setPhoneVerified(true);
        setPhoneVerificationToken(res.data.verificationToken);
        sessionStorage.setItem('register_phone_verified', 'true');
        sessionStorage.setItem('register_phone_token', res.data.verificationToken);
      }
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully!`);
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
      toast.error(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!emailVerified || !phoneVerified) {
      toast.error('Please verify both email and phone before registering.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { confirmPassword: _cp, ...payload }: any = formData;
      
      payload.profilePic = profilePic;

      const activeCountry = selectedCountryRef.current || selectedCountry;
      const countryCode = '+' + getCountryCallingCode(activeCountry);
      let formattedPhone = (formData.phoneNumber || '').trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = countryCode + formattedPhone.replace(/\D/g, '');
      }
      payload.phoneNumber = formattedPhone;

      const dateObj = parseDateStr(payload.dateOfBirth);
      if (dateObj && !isNaN(dateObj.getTime())) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        payload.dateOfBirth = `${y}-${m}-${d}`;
      }

      await axios.post('http://localhost:5000/api/auth/register', {
        ...payload,
        password: encryptPassword(payload.password),
        emailVerificationToken,
        phoneVerificationToken
      });
      
      await checkAuth();

      toast.success('Account registered successfully!');
      sessionStorage.removeItem('register_form_data');
      sessionStorage.removeItem('register_otp_email_target');
      sessionStorage.removeItem('register_otp_phone_target');
      sessionStorage.removeItem('register_email_verified');
      sessionStorage.removeItem('register_phone_verified');
      sessionStorage.removeItem('register_email_token');
      sessionStorage.removeItem('register_phone_token');
      sessionStorage.removeItem('register_email_otp_timer');
      sessionStorage.removeItem('register_phone_otp_timer');
      sessionStorage.removeItem('register_form_data');
      sessionStorage.removeItem('register_show_otp');
      sessionStorage.removeItem('register_errors');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err: any) {
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
        toast.error('Please fix the errors below.');
        
        const slide1Fields = ['firstName', 'lastName', 'email', 'phoneNumber'];
        const hasSlide1Error = Object.keys(err.response.data.validationErrors).some(field => slide1Fields.includes(field));
        
        if (hasSlide1Error) {
          setCurrentSlide(1);
        }
      } else {
        setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed. Cannot connect to server.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const isFormValid = !!(formData.firstName && formData.lastName && formData.email && formData.phoneNumber && formData.password && formData.confirmPassword && formData.dateOfBirth && formData.gender && formData.qualification && termsAccepted) && emailVerified && phoneVerified;
  const isSlide1Valid = !!(formData.firstName && formData.lastName && formData.email && formData.phoneNumber) && !errors.firstName && !errors.lastName && !errors.email && !errors.phoneNumber && emailVerified && phoneVerified;

  const inputClass = (hasError: boolean) => 
    `w-full px-4 py-3 rounded-full border bg-slate-50/70 dark:bg-slate-900/60 text-[14px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200/80 dark:border-slate-800/80 focus:border-[#ea4c89]/80 focus:ring-4 focus:ring-[#ea4c89]/10 hover:border-slate-300 dark:hover:border-slate-700'}`;

  return (
    <div className="w-full flex flex-col justify-center items-center font-sans">
      <AnimatePresence>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      </AnimatePresence>

      <div className="w-full text-left mb-6 flex lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Employee Task Manager</h1>
      </div>

      <div className="w-full flex flex-col items-center text-center mb-4">
        <div className="w-12 h-12 mb-3 rounded-2xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white p-2.5 flex items-center justify-center shadow-md">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <polyline points="9 12 11 14 15 10"></polyline>
          </svg>
        </div>
        <h2 className="text-[24px] font-black text-slate-800 dark:text-slate-200 mb-2">Welcome to Signup</h2>
        <p className="text-[14px] text-slate-500 dark:text-slate-400 font-medium max-w-sm">Create your account to start managing tasks efficiently.</p>
      </div>

      {blockedUntil && blockTimerFormatted ? (
        <div className="w-full p-3 rounded-lg mb-4 text-center text-sm font-semibold border bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
          This email is temporarily blocked. Please try again in {blockTimerFormatted}.
        </div>
      ) : globalMessage.text ? (
        <div className={`w-full p-3 rounded-lg mb-4 text-center text-sm font-medium border ${globalMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400' : 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400'}`}>
          {globalMessage.text}
        </div>
      ) : null}

      <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5 w-full max-w-sm">
        {currentSlide === 1 && (
          <>
          
          {/* Google Button */}
          <button type="button" onClick={() => triggerGoogleLogin()} className="w-full py-3 px-4 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-full flex items-center justify-center gap-3 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors shadow-sm font-semibold text-[14px] text-slate-800 dark:text-slate-200 cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center w-full my-2">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span className="px-4 text-slate-400 dark:text-slate-500 text-sm font-medium">or</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          {/* Profile Picture Upload */}
          <div className="flex flex-col w-full mb-1">
            <div className="relative self-center flex flex-col items-center">
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
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                Supported file: JPG, JPEG, PNG, WEBP (Max 2 MB)
              </span>
            </div>
            {profilePic && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setProfilePic(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="mt-2 text-[12px] self-center font-bold text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" strokeWidth={3} /> Remove
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" />
          </div>

          {/* First Name (Max 50) */}
          <div className="w-full flex flex-col gap-1.5">
            <input id="firstName" name="firstName" maxLength={50} value={formData.firstName} onChange={handleChange} onBlur={handleBlur} onKeyDown={(e) => { if (e.key.length === 1 && !/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }} placeholder="First Name *" className={inputClass(!!errors.firstName)} disabled={isSubmitting} />
            {errors.firstName && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.firstName}</span>}
          </div>
          
          {/* Last Name (Max 50) */}
          <div className="w-full flex flex-col gap-1.5">
            <input id="lastName" name="lastName" maxLength={50} value={formData.lastName} onChange={handleChange} onBlur={handleBlur} onKeyDown={(e) => { if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return; if (!/^[a-zA-Z\s\-']$/.test(e.key)) { e.preventDefault(); return; } const input = e.currentTarget; const cursorStart = input.selectionStart || 0; const value = input.value; if ((e.key === ' ' || e.key === '-' || e.key === "'") && cursorStart === 0) { e.preventDefault(); return; } if (e.key === ' ' && cursorStart > 0 && value[cursorStart - 1] === ' ') { e.preventDefault(); } }} placeholder="Last Name *" className={inputClass(!!errors.lastName)} disabled={isSubmitting} />
            {errors.lastName && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.lastName}</span>}
          </div>

          {/* Email Address & Verify */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }} placeholder="Email Address *" className={inputClass(!!errors.email)} disabled={isSubmitting || emailVerified} />
              {!emailVerified ? (
                <button type="button" onClick={() => handleSendInlineOtp('email')} disabled={verifyLoading === 'email' || !formData.email || !!errors.email || emailOtpSent} className="px-4 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap shadow-sm cursor-pointer">
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
          
          {/* Phone Number & Verify */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex gap-2">
              <div className={inputClass(!!errors.phoneNumber) + " !p-0 flex items-center flex-1"}>
                  <div className="pl-2 pr-4 w-full h-[50px] flex items-center">
                    <PhoneInput
                      country={selectedCountry}
                      international={false}
                      withCountryCallingCode={false}
                      onCountryChange={(newCountryVal) => {
                        if (newCountryVal) {
                          handleCountrySelect(newCountryVal);
                        }
                      }}
                      limitMaxLength={false}
                      inputComponent={CustomInput}
                      countrySelectComponent={CustomCountrySelect}
                      value={formData.phoneNumber}
                      disabled={isSubmitting || phoneVerified}
                      onChange={(value) => {
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
                          finalVal = nationalDigits ? code + nationalDigits : code;
                        }
                        
                        if (finalVal !== otpPhoneTargetRef.current) {
                          setPhoneOtpSent(false);
                          setPhoneOtp('');
                          setPhoneVerified(false);
                          resetPhoneTimer();
                          otpPhoneTargetRef.current = '';
                        }

                        setFormData((prev: any) => ({ ...prev, phoneNumber: finalVal }));
                        const activeCountryCode = selectedCountryRef.current || selectedCountry;
                        const code = activeCountryCode ? '+' + getCountryCallingCode(activeCountryCode) : '';
                        if (finalVal && finalVal !== code) {
                          const { isValid, error } = validatePhoneNumber(finalVal, activeCountryCode);
                          setErrors((prev: any) => ({ ...prev, phoneNumber: isValid ? null : error }));
                        } else {
                          setErrors((prev: any) => ({ ...prev, phoneNumber: null }));
                        }
                      }}
                      onBlur={() => {
                        if (!formData.phoneNumber) {
                          setErrors(prev => ({ ...prev, phoneNumber: 'Please enter your Phone Number.' }));
                        } else {
                          const { isValid, error } = validatePhoneNumber(formData.phoneNumber, selectedCountry);
                          setErrors(prev => ({ ...prev, phoneNumber: isValid ? null : error }));
                          if (isValid) {
                            checkAvailability('phoneNumber', formData.phoneNumber);
                          }
                        }
                      }}
                      className="w-full h-full flex items-center text-[15px] font-medium text-gray-900 dark:text-white outline-none bg-transparent"
                      numberInputProps={{ 
                        "data-countrycode": selectedCountryRef.current ? getCountryCallingCode(selectedCountryRef.current) : (selectedCountry ? getCountryCallingCode(selectedCountry) : '1'),
                        id: "phoneNumber", 
                        name: "phoneNumber", 
                        autoComplete: "tel",
                        placeholder: "Phone Number *", 
                        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
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
                            setFormData((prev: any) => ({ ...prev, phoneNumber: formatted }));
                            const { isValid, error } = validatePhoneNumber(formatted, activeCountry);
                            setErrors((prev: any) => ({ ...prev, phoneNumber: isValid ? null : error }));
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
                          setFormData((prev: any) => ({ ...prev, phoneNumber: formatted }));
                          const { isValid, error } = validatePhoneNumber(formatted, activeCountry);
                          setErrors((prev: any) => ({ ...prev, phoneNumber: isValid ? null : error }));
                        },
                        className: "flex-1 w-full h-full placeholder-gray-400 dark:placeholder-gray-500 bg-transparent min-w-0 border-none outline-none focus:ring-0" 
                      }}
                    />
                  </div>
              </div>
              {!phoneVerified ? (
                <button type="button" onClick={() => handleSendInlineOtp('phone')} disabled={verifyLoading === 'phone' || !formData.phoneNumber || !!errors.phoneNumber || formData.phoneNumber.length < 5 || phoneOtpSent} className="px-4 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold disabled:opacity-50 hover:opacity-90 whitespace-nowrap shadow-sm cursor-pointer">
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

              <div className="flex flex-col gap-4 mt-1">
                <button 
                  type="button" 
                  disabled={!isSlide1Valid}
                  onClick={() => {
                    if (validateSlide1()) {
                      setCurrentSlide(2);
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold transition-all duration-200 flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  Next
                </button>
                <div className="text-center text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-2">
                  Already have an account?{' '}
                  <button type="button" onClick={onSwitch} className="font-semibold text-gray-900 dark:text-white hover:underline decoration-1 underline-offset-2 text-[#4285F4] dark:text-[#8ab4f8]">
                    Sign in
                  </button>
                </div>
              </div>
            </>
          )}

          {currentSlide === 2 && (
            <>
          <div className="w-full flex flex-col gap-1.5">
            <CustomDatePicker
              value={formData.dateOfBirth}
              onChange={(dateStr) => {
                setFormData((prev: any) => ({ ...prev, dateOfBirth: dateStr }));
                setErrors((prev: any) => ({ ...prev, dateOfBirth: validateField('dateOfBirth', dateStr, formData, false) }));
              }}
              onBlur={() => {
                setErrors((prev: any) => ({ ...prev, dateOfBirth: validateField('dateOfBirth', formData.dateOfBirth, formData, false) }));
              }}
              placeholder="Date of Birth (22 Jan 2026) *"
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
          
          {/* Bio Field */}
          <div className="w-full flex flex-col gap-1.5">
              <div className="relative">
                <textarea 
                  id="bio" 
                  name="bio" 
                  maxLength={200}
                  value={formData.bio} 
                  onChange={handleChange} 
                  onBlur={handleBlur}
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
                  placeholder="Bio (Optional)" 
                  className={inputClass(!!errors.bio) + " resize-none h-[52px] py-3.5 pr-20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"} 
                  disabled={isSubmitting} 
                />
                <span className="absolute bottom-3 right-4 text-[10px] text-gray-400 font-semibold pointer-events-none select-none">
                  {(formData.bio || '').length}/200 characters
                </span>
              </div>
              {errors.bio && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.bio}</span>}
          </div>

          <div className="w-full flex flex-col gap-1.5">
            <div className="w-full relative">
              <input 
                id="password" 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                value={formData.password} 
                onChange={handleChange} 
                onBlur={handleBlur}
                placeholder="Password *" 
                className={inputClass(!!errors.password) + " pr-12"} 
                disabled={isSubmitting} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            {formData.password && !errors.password && (
              <div className="w-full flex items-center gap-2 mt-2 px-2">
                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${passwordStrength <= 25 ? 'bg-red-500' : passwordStrength <= 50 ? 'bg-orange-500' : passwordStrength <= 75 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${passwordStrength}%` }}></div>
                </div>
              </div>
            )}
            {errors.password && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.password}</span>}
          </div>
          
          <div className="w-full flex flex-col gap-1.5">
            <div className="w-full relative">
              <input 
                id="confirmPassword" 
                name="confirmPassword" 
                type={showConfirmPassword ? 'text' : 'password'} 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                onBlur={handleBlur}
                placeholder="Confirm Password *" 
                className={inputClass(!!errors.confirmPassword) + " pr-12"} 
                disabled={isSubmitting} 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.confirmPassword}</span>}
          </div>

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

              <div className="flex items-center gap-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setCurrentSlide(1)}
                  className="w-1/3 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full text-[14px] font-bold transition-all duration-200 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid}
                  className="w-2/3 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[14px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 shadow-md cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
                </button>
              </div>
            </div>
          </div>
            </>
          )}
        </form>
    </div>
  );
};

export default Register;
