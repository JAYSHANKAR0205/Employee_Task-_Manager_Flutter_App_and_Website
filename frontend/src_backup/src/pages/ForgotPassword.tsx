import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import OtpInput from '../components/OtpInput';
import { usePersistentTimer } from '../hooks/usePersistentTimer';

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(() => parseInt(sessionStorage.getItem('forgot_password_step') || '1', 10));
  const [data, setData] = useState(() => {
    const saved = sessionStorage.getItem('forgot_password_data');
    return saved ? JSON.parse(saved) : { email: '', otp: '', password: '', confirmPassword: '' };
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    sessionStorage.setItem('forgot_password_step', step.toString());
  }, [step]);

  React.useEffect(() => {
    sessionStorage.setItem('forgot_password_data', JSON.stringify(data));
  }, [data]);

  const navigate = useNavigate();
  const { timeLeft, startTimer } = usePersistentTimer('forgot_password_otp_timer', 60);

  const validateField = (name: string, value: string, isSubmit: boolean = false) => {
    if (!value) return 'This field is required';
    
    switch (name) {
      case 'email':
        if (/^[\s0-9]/.test(value)) return 'Cannot start with space or number';
        if (value.includes(' ')) return 'Email cannot contain spaces';
        if (value.split('@').length !== 2) return 'Must contain exactly one "@" symbol';
        const validDomains = ['.com', '.co.in', '.in', '.org'];
        if (!validDomains.some(domain => value.endsWith(domain))) return 'Must end with .com, .co.in, .in, or .org';
        return null;
      case 'password':
        if (value.length < 8) return 'Password should be at least 8 characters';
        if (value.length >= 100) return 'Password should be less than 100 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(value)) return 'Password contain:\n-One uppercase,\n-One lowercase, -One number,\n-One special character.';
        return null;
      case 'confirmPassword':
        if (value !== data.password) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newData = { ...data, [name]: value };
    setData(newData);
    
    const error = validateField(name, value, false);
    setErrors(prev => ({ ...prev, [name]: error }));

    if (name === 'password' && newData.confirmPassword) {
      const confirmError = validateField('confirmPassword', newData.confirmPassword, false);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleOtpChange = (val: string) => {
    setData({ ...data, otp: val });
    if (errors.otp) {
      setErrors({ ...errors, otp: null });
    }
  };

  const handleResend = async () => {
    setGlobalMessage({ type: '', text: '' });
    try {
      await axios.post('http://localhost:5000/api/users/forgot-password', { email: data.email });
      startTimer();
      setGlobalMessage({ type: 'success', text: 'OTP resent successfully.' });
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Failed to resend OTP.' });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });
    setIsLoading(true);

    if (!data.email) {
      setErrors({ email: 'Email is required' });
      setIsLoading(false);
      return;
    }
    const emailError = validateField('email', data.email, true);
    if (emailError) {
      setErrors({ email: emailError });
      setIsLoading(false);
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/users/forgot-password', { email: data.email });
      setGlobalMessage({ type: 'success', text: 'Success! Please check your email for the OTP.' });
      setStep(2);
      startTimer();
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
      } else {
        setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Cannot connect to server.' });
      }
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.otp || data.otp.length < 6) return setErrors({ otp: '6-digit OTP is required' });
    setStep(3);
    setGlobalMessage({ type: '', text: '' });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });
    setIsLoading(true);

    let isValid = true;
    const newErrors: Record<string, string | null> = {};

    if (!data.password) { newErrors.password = 'Password is required'; isValid = false; }
    else {
      const passError = validateField('password', data.password, true);
      if (passError) { newErrors.password = passError; isValid = false; }
    }

    if (!data.confirmPassword) { newErrors.confirmPassword = 'Required'; isValid = false; }
    else {
      const confirmError = validateField('confirmPassword', data.confirmPassword, true);
      if (confirmError) { newErrors.confirmPassword = confirmError; isValid = false; }
    }

    setErrors(newErrors);
    if (!isValid) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/users/reset-password', {
        email: data.email,
        otp: data.otp,
        newPassword: data.password
      });
      setGlobalMessage({ type: 'success', text: response.data.message });
      sessionStorage.removeItem('forgot_password_step');
      sessionStorage.removeItem('forgot_password_data');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setIsLoading(false);
      setGlobalMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update password.' });
    }
  };

  const isStep1Valid = !!data.email.trim();
  const isStep3Valid = !!data.password && !!data.confirmPassword;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-mint flex items-center justify-center p-4 font-sans relative">
      <ThemeToggle />
      <div className="w-full max-w-lg bg-white dark:bg-forest md:rounded-[2.5rem] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col transition-all duration-500">
        <div className="flex flex-col p-6 md:p-10 custom-scrollbar max-h-[90vh] overflow-y-auto items-center">
          
          <div className="text-center mb-10 mt-4">
            <div className="w-16 h-16 bg-forest dark:bg-sand rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
              <KeyRound className="w-8 h-8 text-white dark:text-forest" />
            </div>
            <h2 className="text-2xl font-bold text-forest dark:text-sand mb-2 tracking-wide">Reset Password</h2>
            <p className="text-xs text-forest/70 dark:text-sand/80 font-medium">
              {step === 1 && "Enter your email to receive an OTP"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Create a new strong password"}
            </p>
          </div>

          {globalMessage.text && (
            <div className={`w-full p-4 rounded-lg mb-6 text-center text-sm font-medium border ${globalMessage.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'}`}>
              {globalMessage.text}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="w-full flex flex-col gap-6">
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand ml-1">Email Address <span className="text-red-500">*</span></label>
                <div className={`flex items-center w-full px-4 py-3 rounded-lg border transition-all duration-200 bg-gray-50 dark:bg-white/5 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'}`}>
                  <div className="pr-3 border-r border-gray-300 dark:border-white/20 flex items-center justify-center mr-3">
                    <Mail className={`w-5 h-5 ${errors.email ? 'text-red-600 dark:text-red-400' : 'text-forest dark:text-sand'}`} />
                  </div>
                  <input 
                    name="email" 
                    value={data.email}
                    onChange={handleChange} 
                    placeholder="name@example.com"
                    className="bg-transparent outline-none flex-1 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <span className="text-red-600 dark:text-red-400 text-xs font-medium ml-1">{errors.email}</span>}
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-300 mt-4 h-16 flex items-center justify-center shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading || !isStep1Valid}
              >
                Send OTP
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-6">
              <div className="w-full flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand ml-1">6-Digit OTP <span className="text-red-500">*</span></label>
                <OtpInput
                  value={data.otp}
                  onChange={handleOtpChange}
                  isInvalid={!!errors.otp}
                  disabled={isLoading}
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
                      onClick={handleResend}
                      className="text-xs font-bold text-forest dark:text-sand hover:underline focus:outline-none"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-300 mt-4 h-16 flex items-center justify-center shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading || data.otp.length < 6}
              >
                Verify OTP
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-6">
              {/* Password Field */}
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand ml-1">New Password <span className="text-red-500">*</span></label>
                <div className={`flex items-center w-full px-4 py-3 rounded-lg border transition-all duration-200 bg-gray-50 dark:bg-white/5 ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'}`}>
                  <div className="pr-3 border-r border-gray-300 dark:border-white/20 flex items-center justify-center mr-3">
                    <Lock className={`w-5 h-5 ${errors.password ? 'text-red-600 dark:text-red-400' : 'text-forest dark:text-sand'}`} />
                  </div>
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={handleChange} 
                    placeholder="••••••••"
                    className="bg-transparent outline-none flex-1 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30"
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="text-gray-900 dark:text-white/50 hover:text-gray-900 dark:hover:text-white outline-none ml-2 shrink-0 transition-colors rounded-md p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <span className="text-red-600 dark:text-red-400 text-xs font-medium ml-1 whitespace-pre-line">{errors.password}</span>}
              </div>

              {/* Confirm Password Field */}
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand ml-1">Confirm Password <span className="text-red-500">*</span></label>
                <div className={`flex items-center w-full px-4 py-3 rounded-lg border transition-all duration-200 bg-gray-50 dark:bg-white/5 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'}`}>
                  <div className="pr-3 border-r border-gray-300 dark:border-white/20 flex items-center justify-center mr-3">
                    <Lock className={`w-5 h-5 ${errors.confirmPassword ? 'text-red-600 dark:text-red-400' : 'text-forest dark:text-sand'}`} />
                  </div>
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={data.confirmPassword}
                    onChange={handleChange} 
                    placeholder="••••••••"
                    className="bg-transparent outline-none flex-1 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30"
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="text-gray-900 dark:text-white/50 hover:text-gray-900 dark:hover:text-white outline-none ml-2 shrink-0 transition-colors rounded-md p-1"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="text-red-600 dark:text-red-400 text-xs font-medium ml-1">{errors.confirmPassword}</span>}
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-300 mt-4 h-16 flex items-center justify-center shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading || !isStep3Valid}
              >
                Update Password
              </button>
            </form>
          )}

          <div className="text-center mt-8 pb-2">
            <Link to="/login" className="text-gray-900 dark:text-white/80 text-sm hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
              Back to <span className="font-bold text-forest dark:text-sand underline decoration-2 underline-offset-4">Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;