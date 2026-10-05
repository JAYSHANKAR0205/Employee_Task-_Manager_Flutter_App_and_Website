import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Mail, Calendar, Users, Lock, Eye, EyeOff, Loader2, Camera, Shield, FileText, CheckCircle2, X } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../styles/phone-input.css';
import CustomCountrySelect from '../components/CustomCountrySelect';
import CustomSelect from '../components/CustomSelect';
import { formatName, validateLastName, validateFirstName, formatEmail, validateEmail, validatePhoneNumber } from '../utils/validation';
import OtpInput from '../components/OtpInput';
import { usePersistentTimer } from '../hooks/usePersistentTimer';

interface RegisterProps {
  onSwitch?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitch }) => {
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('register_form_data');
    return saved ? JSON.parse(saved) : {
      firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', dateOfBirth: '', gender: '', qualification: '', bio: ''
    };
  });
  
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [errors, setErrors] = useState<Record<string, string | null>>(() => {
    const saved = sessionStorage.getItem('register_errors');
    return saved ? JSON.parse(saved) : {};
  });
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [showOtpBox, setShowOtpBox] = useState(() => sessionStorage.getItem('register_show_otp') === 'true');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    sessionStorage.setItem('register_form_data', JSON.stringify(formData));
  }, [formData]);

  React.useEffect(() => {
    sessionStorage.setItem('register_errors', JSON.stringify(errors));
  }, [errors]);

  React.useEffect(() => {
    sessionStorage.setItem('register_show_otp', showOtpBox.toString());
  }, [showOtpBox]);
  
  const navigate = useNavigate();
  const { timeLeft, startTimer } = usePersistentTimer('registration_otp_timer', 60);

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

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const validateField = (name: string, value: string, currentData: typeof formData, isSubmit: boolean = false) => {
    if (!value && name !== 'bio') {
      return 'This field is required.';
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
        const { isValid: isPhoneValid, error: phoneError } = validatePhoneNumber(value);
        return isPhoneValid ? null : phoneError;
      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(value)) return 'Password must include uppercase, lowercase, number, and special character';
        return null;
      case 'confirmPassword':
        if (value !== currentData.password) return 'Passwords do not match';
        return null;
      case 'bio':
        if (value.length > 500) return 'Max 500 chars';
        return null;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;

    if (name === 'firstName' || name === 'lastName') {
      value = formatName(value, name === 'lastName');
    }
    if (name === 'email') {
      value = formatEmail(value);
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

  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};
    let isValid = true;
    
    Object.keys(formData).forEach(key => {
      const value = formData[key as keyof typeof formData];
      if (key !== 'bio' && !value) {
        newErrors[key] = 'This field is required';
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { confirmPassword, ...payload } = formData;
      await axios.post('http://localhost:5000/api/users/register', payload);
      
      if (profilePic) {
        localStorage.setItem(`profile_pic_${formData.email}`, profilePic);
      }
      
      setGlobalMessage({ type: 'success', text: 'Success! Please check your email for the OTP.' });
      setShowOtpBox(true);
      startTimer();
    } catch (err: any) {
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
        setGlobalMessage({ type: 'error', text: 'Please fix the errors below.' });
      } else {
        setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed. Cannot connect to server.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users/verify', { email: formData.email, otp });
      setGlobalMessage({ type: 'success', text: 'Account activated!' });
      sessionStorage.removeItem('register_form_data');
      sessionStorage.removeItem('register_show_otp');
      sessionStorage.removeItem('register_errors');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: 'Invalid OTP.' });
    }
  };

  const inputWrapperClass = (isInvalid: boolean) => 
    `flex items-center rounded-lg border transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 h-[52px] ${
      isInvalid 
        ? 'border-red-500' 
        : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'
    }`;

  const iconWrapperClass = "px-4 h-full border-r border-gray-300 dark:border-white/20 shrink-0 flex items-center justify-center";
  const iconClass = (isInvalid: boolean) => `w-5 h-5 ${isInvalid ? 'text-red-600 dark:text-red-400' : 'text-forest dark:text-sand'}`;
  const inputClass = "bg-transparent px-4 h-full outline-none flex-1 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 w-full min-w-0";
  const labelClass = "text-xs font-bold uppercase tracking-wide text-forest dark:text-sand mb-2 block";
  
  const today = new Date().toISOString().split('T')[0];
  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="w-full flex flex-col items-center">
      <AnimatePresence>
        {showTermsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-forest p-10 rounded-2xl shadow-2xl max-w-md w-full border border-forest/30 dark:border-sand/30"
            >
              <h3 className="text-xl font-bold text-forest dark:text-sand mb-6">Terms and Conditions</h3>
              <ul className="list-disc pl-5 text-sm text-sand/80 space-y-3 mb-8">
                <li>All data provided by user must be valid and authentic.</li>
                <li>Email verification is mandatory for account activation.</li>
                <li>Your profile picture (if provided) is stored locally.</li>
              </ul>
              <button 
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-full py-3 bg-forest dark:bg-sand text-white dark:text-forest rounded-lg font-bold hover:bg-white transition-colors"
              >
                Accept & Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full">
        <div className="mb-10 text-center flex flex-col items-center">
          <h2 className="text-3xl font-black text-forest dark:text-sand mb-2 tracking-tight">Create Account</h2>
          <p className="text-sm text-gray-500 dark:text-white/60 mb-6">Fill in the details below to join our platform.</p>
          
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full border-2 border-dashed border-sand/50 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-sand/60 group-hover:text-gray-700 dark:hover:text-sand transition-colors">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-[10px] uppercase font-bold text-center px-2">Upload<br/>(Max 2MB)</span>
                  </div>
                )}
                {profilePic && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-gray-900 dark:text-white" />
                  </div>
                )}
              </div>
            </div>
            
            {profilePic && (
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setProfilePic(null); 
                  if (fileInputRef.current) fileInputRef.current.value = ''; 
                }}
                className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors"
                title="Remove picture"
              >
                <X className="w-3.5 h-3.5" strokeWidth={3} /> Remove
              </button>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/png, image/jpeg, image/jpg" 
              className="hidden" 
            />
          </div>
        </div>

        {globalMessage.text && (
          <div className={`w-full p-4 rounded-xl mb-8 text-center text-sm font-medium border ${globalMessage.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400' : 'bg-green-500/10 border-green-500/50 text-green-400'}`}>
            {globalMessage.text}
          </div>
        )}

        {!showOtpBox ? (
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-10 w-full">
            
            {/* SECTION: PERSONAL INFORMATION */}
            <div className="flex flex-col gap-6 relative">
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-2">
                <User className="w-5 h-5 text-forest dark:text-sand" />
                <h3 className="text-sm font-black text-forest dark:text-sand uppercase tracking-widest">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="w-full relative">
                  <label className={labelClass}>First Name</label>
                  <div className={`flex items-center rounded-lg border transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 h-[52px] ${
                    errors.firstName 
                      ? 'border-red-500' 
                      : formData.firstName && !errors.firstName 
                        ? 'border-green-500'
                        : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'
                  }`}>
                    <div className={iconWrapperClass}>
                      <User className={`w-5 h-5 ${errors.firstName ? 'text-red-600 dark:text-red-400' : formData.firstName && !errors.firstName ? 'text-green-500' : 'text-forest dark:text-sand'}`} />
                    </div>
                    <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className={inputClass} disabled={isSubmitting} />
                    {formData.firstName && !errors.firstName && (
                      <div className="pr-4 h-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {errors.firstName && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.firstName}</span>}
                </div>

                <div className="w-full relative">
                  <label className={labelClass}>Last Name</label>
                  <div className={`flex items-center rounded-lg border transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 h-[52px] ${
                    errors.lastName 
                      ? 'border-red-500' 
                      : formData.lastName && !errors.lastName 
                        ? 'border-green-500'
                        : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'
                  }`}>
                    <div className={iconWrapperClass}>
                      <User className={`w-5 h-5 ${errors.lastName ? 'text-red-600 dark:text-red-400' : formData.lastName && !errors.lastName ? 'text-green-500' : 'text-forest dark:text-sand'}`} />
                    </div>
                    <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className={inputClass} disabled={isSubmitting} />
                    {formData.lastName && !errors.lastName && (
                      <div className="pr-4 h-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {errors.lastName && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.lastName}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="w-full relative">
                  <label className={labelClass}>Email Address</label>
                  <div className={`flex items-center rounded-lg border transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 h-[52px] ${
                    errors.email 
                      ? 'border-red-500' 
                      : formData.email && !errors.email 
                        ? 'border-green-500'
                        : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'
                  }`}>
                    <div className={iconWrapperClass}>
                      <Mail className={`w-5 h-5 ${errors.email ? 'text-red-600 dark:text-red-400' : formData.email && !errors.email ? 'text-green-500' : 'text-forest dark:text-sand'}`} />
                    </div>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john.doe@example.com" className={inputClass} disabled={isSubmitting} />
                    {formData.email && !errors.email && (
                      <div className="pr-4 h-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {errors.email && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.email}</span>}
                </div>

                <div className="w-full relative">
                  <label className={labelClass}>Phone Number</label>
                  <div className={`flex items-center rounded-lg border transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 h-[52px] ${
                    errors.phoneNumber 
                      ? 'border-red-500' 
                      : formData.phoneNumber && !errors.phoneNumber 
                        ? 'border-green-500'
                        : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'
                  }`}>
                    <div className="w-full h-full px-4 flex items-center min-w-0">
                      <PhoneInput
                        defaultCountry="US"
                        countrySelectComponent={CustomCountrySelect}
                        value={formData.phoneNumber}
                        onChange={(value) => {
                          const newPhone = value || '';
                          setFormData({ ...formData, phoneNumber: newPhone });
                          if (newPhone) {
                            const { isValid, error } = validatePhoneNumber(newPhone);
                            setErrors(prev => ({ ...prev, phoneNumber: isValid ? null : error }));
                          } else {
                            setErrors(prev => ({ ...prev, phoneNumber: 'Phone number is required.' }));
                          }
                        }}
                        className="w-full h-full text-base text-gray-900 dark:text-white outline-none flex items-center min-w-0"
                        numberInputProps={{ className: "placeholder-gray-400 dark:placeholder-white/40 bg-transparent min-w-0" }}
                      />
                    </div>
                    {formData.phoneNumber && !errors.phoneNumber && (
                      <div className="pr-4 h-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {errors.phoneNumber && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.phoneNumber}</span>}
                </div>
              </div>
            </div>

            {/* SECTION: PROFILE INFORMATION */}
            <div className="flex flex-col gap-6 relative">
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-2">
                <FileText className="w-5 h-5 text-forest dark:text-sand" />
                <h3 className="text-sm font-black text-forest dark:text-sand uppercase tracking-widest">Profile Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="w-full relative">
                  <label className={labelClass}>Date of Birth</label>
                  <div className={inputWrapperClass(!!errors.dateOfBirth)}>
                    <div className={iconWrapperClass}><Calendar className={iconClass(!!errors.dateOfBirth)} /></div>
                    <input name="dateOfBirth" type="date" max={today} value={formData.dateOfBirth} onChange={handleChange} className={`${inputClass} !text-gray-900 dark:!text-white`} disabled={isSubmitting} />
                  </div>
                  {errors.dateOfBirth && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.dateOfBirth}</span>}
                </div>
                
                <div className="w-full relative">
                  <label className={labelClass}>Gender</label>
                  <div className="flex items-center justify-between h-[50px] px-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-300 dark:border-white/20">
                    {['Male', 'Female', 'Other'].map(option => (
                      <label key={option} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="radio" name="gender" value={option} checked={formData.gender === option} onChange={handleChange} className="peer sr-only" disabled={isSubmitting} />
                          <div className={`w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${formData.gender === option ? 'border-sand' : 'border-gray-400 dark:border-white/40 group-hover:border-forest dark:group-hover:border-sand'}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-forest dark:bg-sand transition-transform duration-200 ${formData.gender === option ? 'scale-100' : 'scale-0'}`}></div>
                          </div>
                        </div>
                        <span className="text-gray-700 dark:text-white/80 text-sm font-medium group-hover:text-white transition-colors">{option}</span>
                      </label>
                    ))}
                  </div>
                  {errors.gender && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.gender}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="w-full relative flex flex-col justify-start">
                  <label className={labelClass}>Qualification</label>
                  <div className={`${inputWrapperClass(!!errors.qualification)} p-0 h-[50px]`}>
                    <CustomSelect
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      options={["High School", "Graduation", "Master's", "PhD"]}
                      placeholder="Select Qualification"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.qualification && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.qualification}</span>}
                </div>

                <div className="w-full relative flex flex-col justify-start">
                  <label className={labelClass}>Bio (Optional)</label>
                  <div className={`${inputWrapperClass(!!errors.bio)} h-[50px]`}>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." className={`${inputClass} resize-none h-full py-3`} disabled={isSubmitting} />
                  </div>
                  {errors.bio && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.bio}</span>}
                </div>
              </div>
            </div>

            {/* SECTION: SECURITY */}
            <div className="flex flex-col gap-6 relative">
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-2">
                <Shield className="w-5 h-5 text-forest dark:text-sand" />
                <h3 className="text-sm font-black text-forest dark:text-sand uppercase tracking-widest">Security</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
                <div className="w-full relative">
                  <label className={labelClass}>Password</label>
                  <div className={inputWrapperClass(!!errors.password)}>
                    <div className={iconWrapperClass}><Lock className={iconClass(!!errors.password)} /></div>
                    <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder="••••••••" className={inputClass} disabled={isSubmitting} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-4 text-gray-900 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors" disabled={isSubmitting}>
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && !errors.password && (
                    <div className="w-full flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${passwordStrength <= 25 ? 'bg-red-500' : passwordStrength <= 50 ? 'bg-orange-500' : passwordStrength <= 75 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                          style={{ width: `${passwordStrength}%` }}
                        ></div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${passwordStrength <= 25 ? 'text-red-500' : passwordStrength <= 50 ? 'text-orange-500' : passwordStrength <= 75 ? 'text-yellow-400' : 'text-green-500'}`}>
                        {passwordStrength <= 25 ? 'Weak' : passwordStrength <= 50 ? 'Fair' : passwordStrength <= 75 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                  )}

                  {errors.password && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.password}</span>}
                </div>
                
                <div className="w-full relative">
                  <label className={labelClass}>Confirm Password</label>
                  <div className={inputWrapperClass(!!errors.confirmPassword)}>
                    <div className={iconWrapperClass}><CheckCircle2 className={iconClass(!!errors.confirmPassword)} /></div>
                    <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={inputClass} disabled={isSubmitting} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="pr-4 text-gray-900 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors" disabled={isSubmitting}>
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="text-red-600 dark:text-red-400 text-xs mt-1 block font-medium">{errors.confirmPassword}</span>}
                </div>
              </div>
            </div>

            {/* TERMS & SUBMIT */}
            <div className="flex flex-col gap-8 mt-6">
              <div className="relative">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="peer sr-only" disabled={isSubmitting} />
                    <div className="w-5 h-5 rounded border-2 border-gray-400 dark:border-white/40 peer-checked:border-forest dark:peer-checked:border-sand peer-checked:bg-forest dark:peer-checked:bg-sand group-hover:border-forest dark:group-hover:border-sand transition-all flex items-center justify-center">
                      <svg className={`w-3.5 h-3.5 text-white dark:text-forest transition-opacity ${termsAccepted ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-white/80 leading-relaxed font-medium">
                    I agree to the <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTermsModal(true); }} className="text-forest dark:text-sand font-bold hover:text-gray-900 dark:hover:text-white transition-colors">Terms and Conditions</button>
                  </span>
                </label>
                {errors.terms && <span className="text-red-600 dark:text-red-400 text-xs mt-1.5 absolute -bottom-5 left-0">{errors.terms}</span>}
              </div>

              <div className="w-full flex flex-col gap-6">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-300 flex justify-center items-center h-16 disabled:opacity-70"
                  >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Account"}
                </button>
                <div className="text-center text-sm font-medium text-gray-500 dark:text-white/60">
                  Already have an account?{' '}
                  <button type="button" onClick={() => navigate('/login')} className="text-forest dark:text-sand hover:underline font-bold">
                    Log in here
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6 w-full mt-6">
            <div className="w-full flex flex-col gap-3">
              <label className={labelClass}>6-Digit OTP</label>
              <OtpInput
                value={otp}
                onChange={(val) => { setOtp(val); setErrors(prev => ({ ...prev, otp: null })); }}
                isInvalid={!!errors.otp}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center px-1">
                {errors.otp ? (
                  <span className="text-red-600 dark:text-red-400 text-xs font-medium">{errors.otp}</span>
                ) : (
                  <span />
                )}
                {timeLeft > 0 ? (
                  <span className="text-xs font-medium text-forest/70 dark:text-sand/70">
                    Resend OTP in {timeLeft}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { confirmPassword, ...payload } = formData;
                        await axios.post('http://localhost:5000/api/users/register', payload);
                        startTimer();
                        setGlobalMessage({ type: 'success', text: 'OTP resent successfully.' });
                      } catch (err: any) {
                        setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Failed to resend OTP.' });
                      }
                    }}
                    className="text-xs font-bold text-forest dark:text-sand hover:underline focus:outline-none"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting || otp.length < 6}
              className="w-full py-4 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-300 mt-2 h-16 flex items-center justify-center disabled:opacity-70 shadow-lg hover:shadow-xl"
            >
              Verify & Activate
            </button>
            <button
              type="button"
              onClick={() => setShowOtpBox(false)}
              className="text-center text-sm font-bold text-forest dark:text-sand hover:underline transition-colors mt-2"
            >
              Back to Registration
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
