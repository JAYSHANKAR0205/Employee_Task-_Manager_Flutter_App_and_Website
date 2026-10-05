import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { encryptPassword } from '../../../utils/crypto';
import { Eye, EyeOff, KeyRound, Mail, CheckCircle2, AlertCircle, Loader2, Check } from 'lucide-react';
import OtpInput from '../../../components/OtpInput';
import { usePersistentTimer } from '../../../hooks/usePersistentTimer';
const ResetPasswordTab: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'direct' | 'otp'>(() => {
    const saved = sessionStorage.getItem('profile_reset_mode');
    return saved === 'otp' ? 'otp' : 'direct';
  });
  
  // Direct change form states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP 3-Step Reset form states (1: Send OTP, 2: Verify OTP, 3: Set New Password)
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(() => {
    const saved = sessionStorage.getItem('profile_reset_otp_step');
    const parsed = saved ? parseInt(saved, 10) : 1;
    return (parsed === 2 || parsed === 3) ? (parsed as 2 | 3) : 1;
  });
  const [otp, setOtp] = useState(() => sessionStorage.getItem('profile_reset_otp_input') || '');

  useEffect(() => {
    sessionStorage.setItem('profile_reset_otp_input', otp);
  }, [otp]);
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('profile_reset_otp_verified') === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('profile_reset_mode', mode);
  }, [mode]);

  useEffect(() => {
    sessionStorage.setItem('profile_reset_otp_step', otpStep.toString());
  }, [otpStep]);

  useEffect(() => {
    sessionStorage.setItem('profile_reset_otp_verified', isOtpVerified ? 'true' : 'false');
  }, [isOtpVerified]);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Persistent Timer for OTP Resend (60 seconds)
  const { timeLeft, startTimer } = usePersistentTimer('profile_reset_otp_timer', 60);

  if (!user) return null;

  const validatePasswordComplexity = (pass: string) => {
    if (!pass) return 'Password is required';
    if (pass.length < 8) return 'Minimum 8 characters required';
    if (!/(?=.*[a-z])/.test(pass)) return 'Must contain at least 1 lowercase letter';
    if (!/(?=.*[A-Z])/.test(pass)) return 'Must contain at least 1 uppercase letter';
    if (!/(?=.*\d)/.test(pass)) return 'Must contain at least 1 number';
    if (!/(?=.*[^A-Za-z0-9])/.test(pass)) return 'Must contain at least 1 special character (!@#$%^&*)';
    return null;
  };

  // Direct Password Change submit
  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });
    setErrors({});

    const newErrors: Record<string, string | null> = {};
    const passErr = validatePasswordComplexity(newPassword);
    if (passErr) newErrors.newPassword = passErr;

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/change-password', {
        oldPassword: oldPassword ? encryptPassword(oldPassword) : undefined,
        newPassword: encryptPassword(newPassword)
      });

      setGlobalMessage({ type: 'success', text: response.data.message || 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (err: any) {
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
      } else {
        setGlobalMessage({
          type: 'error',
          text: err.response?.data?.error || 'Failed to update password. Please try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async () => {
    setGlobalMessage({ type: '', text: '' });
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: user.email });
      setOtpStep(2);
      const secs = res.data?.remainingSeconds || (res.data?.expiresAt ? Math.ceil((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000) : 60);
      startTimer(secs);
      setGlobalMessage({ type: 'success', text: `OTP sent successfully to ${user.email}` });
    } catch (err: any) {
      setGlobalMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to send OTP. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });
    setErrors({});

    if (!otp || otp.length < 6) {
      setErrors({ otp: '6-digit OTP is required' });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-forgot-otp', {
        email: user.email,
        otp
      });
      setIsOtpVerified(true);
      setOtpStep(3);
      setGlobalMessage({ type: 'success', text: 'OTP Verified Successfully! Now set your new password.' });
    } catch (err: any) {
      setGlobalMessage({
        type: 'error',
        text: err.response?.data?.error || 'Invalid or expired OTP. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set New Password after OTP verification
  const handleResetPasswordFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });
    setErrors({});

    const newErrors: Record<string, string | null> = {};
    const passErr = validatePasswordComplexity(newPassword);
    if (passErr) newErrors.newPassword = passErr;

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: user.email,
        otp,
        newPassword: encryptPassword(newPassword)
      });

      setGlobalMessage({ type: 'success', text: response.data.message || 'Password reset successfully!' });
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setIsOtpVerified(false);
      setOtpStep(1);
      setErrors({});
    } catch (err: any) {
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
      } else {
        setGlobalMessage({
          type: 'error',
          text: err.response?.data?.error || 'Failed to reset password. Please try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border bg-gray-50/70 dark:bg-slate-900/60 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none transition-all ${
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
        : 'border-gray-200 dark:border-gray-800 focus:border-[#ea4c89] focus:ring-4 focus:ring-[#ea4c89]/10'
    }`;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-gray-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#ea4c89]" />
            Reset Account Password
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Securely update your password to protect your account.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('direct');
              setGlobalMessage({ type: '', text: '' });
              setErrors({});
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'direct'
                ? 'bg-white dark:bg-slate-900 text-[#ea4c89] font-bold shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Direct Change
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setGlobalMessage({ type: '', text: '' });
              setErrors({});
              setOtpStep(1);
              setOtp('');
              setIsOtpVerified(false);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'otp'
                ? 'bg-white dark:bg-slate-900 text-[#ea4c89] font-bold shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Reset via OTP
          </button>
        </div>
      </div>

      {/* Global Alert Messages */}
      {globalMessage.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${
            globalMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {globalMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{globalMessage.text}</span>
        </div>
      )}

      {/* DIRECT CHANGE FORM */}
      {mode === 'direct' && (
        <form onSubmit={handleDirectPasswordChange} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password (if set)"
                className={inputClass(!!errors.oldPassword)}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="text-red-500 text-xs font-semibold mt-1">{errors.oldPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                }}
                placeholder="Enter new strong password"
                className={inputClass(!!errors.newPassword)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-500 text-xs font-semibold mt-1 leading-relaxed">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                }}
                placeholder="Re-enter new password"
                className={inputClass(!!errors.confirmPassword)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs font-semibold mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-gray-800/60 text-xs space-y-1.5 text-gray-500 dark:text-gray-400">
            <p className="font-bold text-gray-700 dark:text-gray-300">Password Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li className={newPassword.length >= 8 ? 'text-green-600 font-semibold' : ''}>At least 8 characters long</li>
              <li className={/(?=.*[a-z])/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 lowercase letter</li>
              <li className={/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 uppercase letter</li>
              <li className={/(?=.*\d)/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 numeric digit</li>
              <li className={/(?=.*[^A-Za-z0-9])/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 special character</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="w-full py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
          </button>
        </form>
      )}

      {/* 3-STEP VERIFIED OTP RESET FORM */}
      {mode === 'otp' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-3">
            <Mail className="w-5 h-5 shrink-0 text-[#ea4c89]" />
            <span>
              A 6-digit verification code will be sent to your registered email: <strong>{user.email}</strong>
            </span>
          </div>

          {/* STEP 1: Send OTP */}
          {otpStep === 1 && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP to Email'}
            </button>
          )}

          {/* STEP 2: Verify OTP (Verify button disabled until 6 digits entered; Resend OTP timer in seconds) */}
          {otpStep === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">
                  Enter 6-Digit OTP Sent to Email
                </label>
                <div className="flex justify-center">
                  <OtpInput length={6} value={otp} onChange={setOtp} />
                </div>
                {errors.otp && (
                  <p className="text-red-500 text-xs font-semibold mt-2 text-center">{errors.otp}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading || timeLeft > 0}
                  className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : 'Resend OTP'}
                </button>

                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="flex-1 py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password (Only shown after OTP is verified) */}
          {otpStep === 3 && isOtpVerified && (
            <form onSubmit={handleResetPasswordFinal} className="space-y-5">
              {/* Green Verified Badge */}
              <div className="p-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-xs font-bold text-green-700 dark:text-green-300">
                <Check className="w-4 h-4 text-green-600" />
                <span>OTP Verified Successfully! Set your new password below.</span>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                    }}
                    placeholder="Enter new strong password"
                    className={inputClass(!!errors.newPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-xs font-semibold mt-1 leading-relaxed">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }}
                    placeholder="Re-enter new password"
                    className={inputClass(!!errors.confirmPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs font-semibold mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-gray-800/60 text-xs space-y-1.5 text-gray-500 dark:text-gray-400">
                <p className="font-bold text-gray-700 dark:text-gray-300">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={newPassword.length >= 8 ? 'text-green-600 font-semibold' : ''}>At least 8 characters long</li>
                  <li className={/(?=.*[a-z])/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 lowercase letter</li>
                  <li className={/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 uppercase letter</li>
                  <li className={/(?=.*\d)/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 numeric digit</li>
                  <li className={/(?=.*[^A-Za-z0-9])/.test(newPassword) ? 'text-green-600 font-semibold' : ''}>Includes at least 1 special character</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full py-3 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ResetPasswordTab;
