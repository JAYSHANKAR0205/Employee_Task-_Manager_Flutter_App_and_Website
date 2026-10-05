import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import OtpInput from '../../../components/OtpInput';
import { usePersistentTimer } from '../../../hooks/usePersistentTimer';
import { formatEmail, validateEmail } from '../../../utils/validation';
import { encryptPassword } from '../../../utils/crypto';
import AnimationPanel, { ANIM_STYLE } from '../../../components/ui/AnimationPanel';
import { safeNavigateBack } from '../../../utils/navigation';

const ForgotPassword: React.FC = () => {
  const DEFAULT_FG_DATA = { email: '', otp: '', password: '', confirmPassword: '' };

  const [step, setStep] = useState(() => {
    try {
      const val = parseInt(sessionStorage.getItem('forgot_password_step') || '1', 10);
      return isNaN(val) || val < 1 || val > 3 ? 1 : val;
    } catch (e) {
      return 1;
    }
  });

  const [data, setData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('forgot_password_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...DEFAULT_FG_DATA, ...parsed, password: '', confirmPassword: '' };
        }
      }
    } catch (e) {}
    return DEFAULT_FG_DATA;
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    sessionStorage.setItem('forgot_password_step', step.toString());
  }, [step]);

  React.useEffect(() => {
    if (data && typeof data === 'object') {
      const { password: _p, confirmPassword: _cp, ...safeData } = data;
      sessionStorage.setItem('forgot_password_data', JSON.stringify(safeData));
    }
  }, [data]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { timeLeft, startTimer } = usePersistentTimer('forgot_password_otp_timer', 60);

  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [blockTimerFormatted, setBlockTimerFormatted] = useState<string>('');

  // Check and sync real-time lockout timer for current email
  React.useEffect(() => {
    const emailKey = data.email ? data.email.toLowerCase().trim() : '';
    if (!emailKey) {
      setBlockedUntil(null);
      setBlockTimerFormatted('');
      return;
    }

    try { localStorage.removeItem(`forgot_password_block_${emailKey}`); } catch (e) {}
    const savedBlock = Cookies.get(`forgot_password_block_${emailKey}`);
    const blockTs = savedBlock ? parseInt(savedBlock, 10) : null;

    if (blockTs && blockTs > Date.now()) {
      setBlockedUntil(blockTs);
    } else {
      if (savedBlock) {
        Cookies.remove(`forgot_password_block_${emailKey}`, { path: '/' });
      }
      setBlockedUntil(null);
      setBlockTimerFormatted('');
    }
  }, [data.email]);

  React.useEffect(() => {
    if (!blockedUntil) return;

    const updateTimer = () => {
      const remainingMs = blockedUntil - Date.now();
      if (remainingMs <= 0) {
        const emailKey = data.email ? data.email.toLowerCase().trim() : '';
        if (emailKey) {
          Cookies.remove(`forgot_password_block_${emailKey}`, { path: '/' });
          try { localStorage.removeItem(`forgot_password_block_${emailKey}`); } catch (e) {}
        }
        setBlockedUntil(null);
        setBlockTimerFormatted('');
        return;
      }
      const remainingSecs = Math.max(1, Math.ceil(remainingMs / 1000));
      const mins = Math.max(1, Math.ceil(remainingSecs / 60));
      const formattedTimer = `${mins} minute${mins > 1 ? 's' : ''}`;
      setBlockTimerFormatted(`Please try again in ${formattedTimer}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil, data.email]);

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const validateField = (name: string, value: string, currentData: typeof data = data, _isSubmit: boolean = false) => {
    if (!value && name !== 'password' && name !== 'confirmPassword') return 'Please enter your email.';
    
    switch (name) {
      case 'email':
        const err = validateEmail(value);
        return err.isValid ? null : err.error;
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
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'email') {
      value = formatEmail(value);
    }
    const newData = { ...data, [name]: value };
    setData(newData);
    
    if (name !== 'email') {
      const error = validateField(name, value, newData, false);
      setErrors(prev => ({ ...prev, [name]: error }));

      if (name === 'password' && newData.confirmPassword) {
        const confirmError = validateField('confirmPassword', newData.confirmPassword, newData, false);
        setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
      }
    } else {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  const handleOtpChange = (val: string) => {
    setData({ ...data, otp: val });
    if (errors.otp) {
      setErrors({ ...errors, otp: null });
    }
  };

  const handleResend = async () => {
    if (blockedUntil && blockedUntil > Date.now()) {
      const remainingMins = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
      toast.error(`This email is temporarily blocked. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`);
      return;
    }
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      startTimer();
      toast.success('OTP resent successfully.');
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const bTs = resData.blockedUntil || (Date.now() + (resData.remainingTime || 600) * 1000);
        const emailKey = data.email ? data.email.toLowerCase().trim() : '';
        if (emailKey) {
          Cookies.set(`forgot_password_block_${emailKey}`, bTs.toString(), { expires: 1/24, path: '/' });
        }
        setBlockedUntil(bTs);
        toast.error(resData.error || `This email is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`);
        Cookies.remove('forgot_password_step', { path: '/' });
        Cookies.remove('forgot_password_data', { path: '/' });
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      toast.error(err.response?.data?.error || 'Failed to resend OTP.');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!data.email.trim()) {
      toast.error('Please enter valid email.');
      return;
    }

    const emailError = validateField('email', data.email, true);
    if (emailError) {
      toast.error('Please enter valid email.');
      return;
    }

    if (blockedUntil && blockedUntil > Date.now()) {
      const remainingMins = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
      toast.error(`This email is temporarily blocked. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: data.email });
      toast.success('Success! Please check your email for the OTP.');
      const { password: _p, confirmPassword: _cp, ...safeData } = data;
      sessionStorage.setItem('forgot_password_step', '2');
      sessionStorage.setItem('forgot_password_data', JSON.stringify(safeData));
      setStep(2);
      const secs = res.data?.remainingSeconds || (res.data?.expiresAt ? Math.ceil((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000) : 60);
      startTimer(secs);
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const bTs = resData.blockedUntil || (Date.now() + (resData.remainingTime || 600) * 1000);
        const emailKey = data.email ? data.email.toLowerCase().trim() : '';
        if (emailKey) {
          sessionStorage.setItem(`forgot_password_block_${emailKey}`, bTs.toString());
        }
        setBlockedUntil(bTs);
        toast.error(resData.error || `This email is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`);
        sessionStorage.removeItem('forgot_password_step');
        sessionStorage.removeItem('forgot_password_data');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      const backendMsg = err.response?.data?.error || err.response?.data?.validationErrors?.email || "Email doesn't match with database.";
      toast.error(backendMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!data.otp || data.otp.length < 6) return setErrors({ otp: '6-digit OTP is required' });

    setIsLoading(true);
    try {
      await api.post('/auth/verify-forgot-otp', {
        email: data.email,
        otp: data.otp
      });
      const { password: _p, confirmPassword: _cp, ...safeData } = data;
      sessionStorage.setItem('forgot_password_step', '3');
      sessionStorage.setItem('forgot_password_data', JSON.stringify(safeData));
      setStep(3);
      toast.success('OTP verified successfully! Please enter your new password.');
    } catch (err: any) {
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        const resData = err.response.data;
        const bTs = resData.blockedUntil || (Date.now() + (resData.remainingTime || 600) * 1000);
        const emailKey = data.email ? data.email.toLowerCase().trim() : '';
        if (emailKey) {
          sessionStorage.setItem(`forgot_password_block_${emailKey}`, bTs.toString());
        }
        setBlockedUntil(bTs);
        toast.error(resData.error || `This email is temporarily blocked. Please try again in ${resData.remainingMinutes || 10} minutes.`);
        return;
      }
      toast.error(err.response?.data?.error || 'Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const response = await api.post('/auth/reset-password', {
        email: data.email,
        otp: data.otp,
        newPassword: encryptPassword(data.password)
      });
      toast.success(response.data.message || 'Password reset successfully!');
      sessionStorage.removeItem('forgot_password_step');
      sessionStorage.removeItem('forgot_password_data');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.isBlocked || err.response?.status === 429) {
        toast.error(err.response.data.error || 'This email is temporarily blocked. Please try again later.');
        return;
      }
      toast.error(err.response?.data?.error || 'Failed to update password.');
    }
  };

  const passwordStrength = getPasswordStrength(data.password);
  const isStep3Valid = !!data.password && !!data.confirmPassword && !errors.password && !errors.confirmPassword;

  const inputClass = (hasError: boolean) => 
    `w-full px-4 py-3.5 rounded-full border bg-slate-50/70 dark:bg-slate-900/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200/80 dark:border-slate-800/80 focus:border-[#ea4c89]/80 focus:ring-4 focus:ring-[#ea4c89]/10 hover:border-slate-300 dark:hover:border-slate-700'}`;

  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0f1117] flex font-sans relative overflow-hidden text-slate-800 dark:text-slate-200">
      <style>{ANIM_STYLE}</style>

      {/* Left Column: Form */}
      <div id="auth-left-panel" className="w-full lg:w-[60%] flex flex-col justify-center items-center p-6 md:p-12 z-50 relative overflow-hidden">
        <div className="w-full max-w-md mx-auto relative flex flex-col transition-all duration-500 h-full justify-center">
          <div className="flex flex-col py-6 w-full custom-scrollbar">
            
            <div className="w-full mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  Cookies.remove('forgot_password_step', { path: '/' });
                  Cookies.remove('forgot_password_data', { path: '/' });
                  safeNavigateBack(navigate, '/login');
                }}
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h2 className="text-[28px] font-black text-gray-900 dark:text-white mb-3">Reset Password</h2>
              <p className="text-[15px] text-gray-600 dark:text-gray-400 font-medium max-w-sm">
                {step === 1 && "Enter your email to receive an OTP"}
                {step === 2 && "Enter the OTP sent to your email"}
                {step === 3 && "Create a new strong password"}
              </p>
            </div>

            {blockTimerFormatted && (
              <div className="w-full max-w-sm mx-auto mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold leading-relaxed text-center animate-in fade-in">
                <p>This email is temporarily blocked.</p>
                <p className="mt-1 font-sans font-bold text-sm text-red-700 dark:text-red-300">
                  {blockTimerFormatted}
                </p>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleSendOtp} className="w-full flex flex-col gap-5 max-w-sm mx-auto">
                <div className="w-full flex flex-col gap-1.5">
                  <input 
                    name="email" 
                    type="email"
                    value={data.email}
                    onChange={handleChange} 
                    onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                    placeholder="Enter email address"
                    className={inputClass(!!errors.email)}
                    disabled={isLoading}
                  />
                  {errors.email && <span className="text-red-500 text-xs font-semibold ml-4 mt-1">{errors.email}</span>}
                </div>

                <div className="w-full mt-2">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[15px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 shadow-md cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-5 max-w-sm mx-auto">
                <div className="w-full flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider ml-1">6-Digit OTP</label>
                  <OtpInput
                    value={data.otp}
                    onChange={handleOtpChange}
                    isInvalid={!!errors.otp}
                    disabled={isLoading}
                  />
                  <div className="flex justify-between items-center px-1 mt-1">
                    {errors.otp ? (
                      <span className="text-red-500 text-xs font-semibold">{errors.otp}</span>
                    ) : (
                      <span />
                    )}
                    {timeLeft > 0 ? (
                      <span className="text-xs font-semibold text-gray-500">
                        Resend OTP in {timeLeft}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-xs font-bold text-gray-900 dark:text-white hover:text-[#ea4c89] dark:hover:text-[#ea4c89] transition-colors focus:outline-none"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full mt-2">
                  <button 
                    type="submit" 
                    disabled={isLoading || data.otp.length < 6}
                    className="w-full py-3.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[15px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 shadow-md cursor-pointer"
                  >
                    Verify OTP
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-5 max-w-sm mx-auto">
                <div className="w-full flex flex-col gap-1.5 relative">
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={handleChange} 
                    placeholder="New password"
                    className={inputClass(!!errors.password) + " pr-12"}
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {data.password && !errors.password && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className={`h-full transition-all duration-500 ${passwordStrength <= 25 ? 'bg-red-500' : passwordStrength <= 50 ? 'bg-orange-500' : passwordStrength <= 75 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${passwordStrength}%` }}></div>
                    </div>
                  )}
                  {errors.password && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 whitespace-pre-line">{errors.password}</span>}
                </div>

                <div className="w-full flex flex-col gap-1.5 relative">
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={data.confirmPassword}
                    onChange={handleChange} 
                    placeholder="Confirm new password"
                    className={inputClass(!!errors.confirmPassword) + " pr-12"}
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {errors.confirmPassword && <span className="text-red-500 text-xs font-semibold ml-4 mt-1">{errors.confirmPassword}</span>}
                </div>

                <div className="w-full mt-2">
                  <button 
                    type="submit" 
                    disabled={isLoading || !isStep3Valid}
                    className="w-full py-3.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[15px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 shadow-md cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center mt-10">
              <Link 
                to="/login" 
                onClick={() => {
                  Cookies.remove('forgot_password_step', { path: '/' });
                  Cookies.remove('forgot_password_data', { path: '/' });
                }}
                className="text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Back to <span className="font-bold underline decoration-2 underline-offset-4">Sign in</span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Media & Animation */}
      <AnimationPanel />

    </div>
  );
};

export default ForgotPassword;
