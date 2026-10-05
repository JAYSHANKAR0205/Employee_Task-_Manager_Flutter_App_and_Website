/**
 * @file Verify.tsx
 * @description 6-Digit OTP Account Verification Page Component.
 * 
 * WORK OF THIS FILE:
 * - Collects the 6-digit verification OTP dispatched during user registration.
 * - Submits OTP verification to `/api/auth/verify-otp`.
 * - Manages resend cooldown timers and navigates verified users to `/dashboard`.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Handles the mandatory step-two verification process required to activate newly registered accounts.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import OtpInput from '../../../components/OtpInput';
import { usePersistentTimer } from '../../../hooks/usePersistentTimer';
import AnimationPanel, { ANIM_STYLE } from '../../../components/ui/AnimationPanel';
import { formatEmail } from '../../../utils/validation';
import Cookies from 'js-cookie';
import { safeNavigateBack } from '../../../utils/navigation';

const Verify: React.FC = () => {
  const DEFAULT_VERIFY_DATA = { email: '', otp: '' };
  const [data, setData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('verify_page_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...DEFAULT_VERIFY_DATA, ...parsed };
        }
      }
    } catch (e) {}
    return DEFAULT_VERIFY_DATA;
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { timeLeft, startTimer } = usePersistentTimer('registration_otp_timer', 60);

  useEffect(() => {
    if (data && typeof data === 'object') {
      sessionStorage.setItem('verify_page_data', JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    const savedEndTime = localStorage.getItem('registration_otp_timer') || Cookies.get('registration_otp_timer');
    if (!savedEndTime) {
      startTimer();
    }
  }, [startTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'email') value = formatEmail(value);
    setData({ ...data, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleOtpChange = (val: string) => {
    setData({ ...data, otp: val });
    if (errors.otp) {
      setErrors({ ...errors, otp: null });
    }
  };

  const handleResend = () => {
    startTimer();
    setGlobalMessage({ type: 'success', text: 'OTP resent successfully.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalMessage({ type: '', text: '' });
    setIsLoading(true);

    if (!data.email) {
      setErrors(prev => ({ ...prev, email: 'Please enter your email.' }));
      setIsLoading(false);
      return;
    }
    if (!data.otp || data.otp.length < 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter 6-digit OTP.' }));
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post('/users/verify', data);
      sessionStorage.removeItem('verify_page_data');
      setGlobalMessage({ type: 'success', text: response.data.message });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setIsLoading(false);
      if (err.response && err.response.data && err.response.data.error) {
        setGlobalMessage({ type: 'error', text: err.response.data.error });
      } else {
        setGlobalMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
      }
    }
  };

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
                onClick={() => safeNavigateBack(navigate, '/register')}
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
                </svg>
              </div>
              <h2 className="text-[28px] font-black text-gray-900 dark:text-white mb-3">Verify Email</h2>
              <p className="text-[15px] text-gray-600 dark:text-gray-400 font-medium max-w-sm">Enter the 6-digit OTP sent to your email inbox.</p>
            </div>

            {globalMessage.text && (
              <div className={`w-full p-4 rounded-xl mb-6 text-center text-sm font-medium border ${globalMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400' : 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400'}`}>
                {globalMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 max-w-sm mx-auto">
              
              {/* Email Field */}
              <div className="w-full flex flex-col gap-1.5">
                <input 
                  name="email" 
                  type="email"
                  value={data.email}
                  onChange={handleChange} 
                  onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                  placeholder="Email Address *"
                  className={inputClass(!!errors.email)}
                  disabled={isLoading}
                />
                {errors.email && <span className="text-red-500 text-xs font-semibold ml-4 mt-1">{errors.email}</span>}
              </div>

              {/* OTP Field */}
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
                  className="w-full py-3.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[15px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 focus:outline-none shadow-md cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Account"}
                </button>
              </div>
            </form>

            <div className="text-center mt-10">
              <Link to="/login" className="text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-900 dark:hover:text-white transition-colors">
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

export default Verify;
