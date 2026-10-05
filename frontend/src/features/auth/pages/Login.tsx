import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import TermsModal from '../../../components/TermsModal';
import PrivacyModal from '../../../components/PrivacyModal';
import { useGoogleLogin } from '@react-oauth/google';
import { formatEmail, validateEmail } from '../../../utils/validation';
import { encryptPassword } from '../../../utils/crypto';

interface LoginProps {
  onSwitch?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitch }) => {
  const [data, setData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(() => {
    return sessionStorage.getItem('remember_me') === 'true';
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const navigate = useNavigate();
  const { checkAuth, login: loginUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Restore remembered email if rememberMe was checked
    const savedEmail = sessionStorage.getItem('remembered_email');
    const isRemembered = sessionStorage.getItem('remember_me') === 'true';
    if (savedEmail && isRemembered) {
      setData(prev => ({ ...prev, email: savedEmail }));
    }

    // Display blocked message if applicable
    if (window.location.search.includes('blocked=true')) {
      toast.error('Your account has been blocked by an administrator.');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'email') {
      value = formatEmail(value);
    }
    const newData = { ...data, [name]: value };
    setData(newData);

    if (name === 'email') {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, email: null }));
      } else {
        const { isValid, error } = validateEmail(value);
        setErrors(prev => ({ ...prev, email: isValid ? null : error }));
      }
    } else {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, email: 'Please enter your email.' }));
      } else {
        const { isValid, error } = validateEmail(value);
        setErrors(prev => ({ ...prev, email: isValid ? null : error }));
      }
    }
    if (name === 'password') {
      if (!value) {
        setErrors(prev => ({ ...prev, password: 'Please enter your password.' }));
      } else {
        setErrors(prev => ({ ...prev, password: null }));
      }
    }
  };

  const handleGoogleAuthSuccess = async (token?: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/google-auth', {
        token: token || 'mock_google_token',
        email: data.email || undefined
      });

      if (response.data.isNewUser) {
        toast.info('No account found. Please complete your profile to register.');
        navigate('/complete-profile', { state: { googleData: response.data.googleData, isFromLogin: true } });
      } else {
        try {
          await checkAuth();
          toast.success('Login successful!');
          navigate('/dashboard');
        } catch (authErr) {
          toast.success('Login successful!');
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Google Login failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    let hasError = false;
    const newErrors: Record<string, string | null> = {};

    if (!data.email.trim()) {
      newErrors.email = 'Please enter your email.';
      hasError = true;
    } else {
      const { isValid, error } = validateEmail(data.email);
      if (!isValid) {
        newErrors.email = error;
        hasError = true;
      }
    }

    if (!data.password) {
      newErrors.password = 'Please enter your password.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: encryptPassword(data.password)
      });
      
      if (rememberMe) {
        sessionStorage.setItem('remembered_email', data.email);
        sessionStorage.setItem('remember_me', 'true');
      } else {
        sessionStorage.removeItem('remembered_email');
        sessionStorage.removeItem('remember_me');
      }

      if (response.data.user) {
        loginUser(response.data.user);
      }
      await checkAuth();
      
      toast.success('Login successful!');
      
      setTimeout(() => {
        if (response.data.user && response.data.user.isProfileComplete === false) {
          navigate('/complete-profile', { state: { isFromAdminCreate: true } });
        } else {
          navigate('/dashboard');
        }
      }, 300); 
    } catch (err: any) {
      setErrors({});
      const serverMsg = err.response?.data?.error 
        || err.response?.data?.validationErrors?.email 
        || err.response?.data?.validationErrors?.password 
        || 'Invalid email or password';
      
      const finalMsg = (serverMsg.includes("database") || serverMsg.includes("Wrong password"))
        ? 'Invalid email or password'
        : serverMsg;

      toast.error(finalMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = !!data.email.trim() && !!data.password;
  const inputClass = (hasError: boolean) => 
    `w-full px-4 py-3.5 rounded-full border bg-slate-50/70 dark:bg-slate-900/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200/80 dark:border-slate-800/80 focus:border-[#ea4c89]/80 focus:ring-4 focus:ring-[#ea4c89]/10 hover:border-slate-300 dark:hover:border-slate-700'}`;

  return (
    <div className="w-full flex flex-col justify-center items-center font-sans">
      <AnimatePresence>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      </AnimatePresence>

      <div className="w-full text-left mb-10 flex lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Employee Task Manager</h1>
      </div>

      {/* Header Section */}
      <div className="w-full flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white p-2.5 flex items-center justify-center shadow-md">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <polyline points="9 12 11 14 15 10"></polyline>
          </svg>
        </div>
        <h2 className="text-[28px] font-black text-slate-800 dark:text-slate-200 mb-3">Welcome to Login</h2>
        <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium max-w-sm">Sign in to your account to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 max-w-sm">
        
        {/* Google Login Button */}
        <button type="button" onClick={() => triggerGoogleLogin()} className="w-full py-3.5 px-4 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-full flex items-center justify-center gap-3 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors shadow-sm font-semibold text-[15px] text-slate-800 dark:text-slate-200 cursor-pointer">
          <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center w-full my-1">
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          <span className="px-4 text-slate-400 dark:text-slate-500 text-sm font-medium">or</span>
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        </div>

        {/* Email Field */}
        <div className="w-full flex flex-col gap-1.5">
          <input 
            id="email"
            type="email"
            name="email" 
            value={data.email}
            onChange={handleChange} 
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
            placeholder="Email Address *"
            className={inputClass(!!errors.email)}
            disabled={isLoading}
          />
          {errors.email && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.email}</span>}
        </div>

        {/* Password Field */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="w-full relative">
            <input 
              id="password"
              name="password" 
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={handleChange} 
              onBlur={handleBlur}
              placeholder="Password *"
              className={`w-full px-4 py-3.5 pr-12 rounded-full border bg-slate-50/70 dark:bg-slate-900/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200/80 dark:border-slate-800/80 focus:border-[#ea4c89]/80 focus:ring-4 focus:ring-[#ea4c89]/10 hover:border-slate-300 dark:hover:border-slate-700'}`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
            >
              {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <span className="text-red-500 text-xs font-semibold ml-4 mt-1 block">{errors.password}</span>}
        </div>

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between w-full px-1 text-[13px]">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#ea4c89] focus:ring-[#ea4c89]/20 transition cursor-pointer accent-[#ea4c89]"
            />
            <span>Remember me</span>
          </label>

          <button 
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <div className="w-full mt-1">
          <button 
            type="submit" 
            disabled={isLoading || !isFormValid}
            className="w-full py-3.5 bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white rounded-full text-[15px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:opacity-90 focus:outline-none shadow-md cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </div>

        {/* Create Account Link */}
        <div className="text-center text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-4">
          Don't have an account?{' '}
          <button type="button" onClick={onSwitch} className="font-semibold text-gray-900 dark:text-white hover:underline decoration-1 underline-offset-2 text-[#4285F4] dark:text-[#8ab4f8]">
            Sign up
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-500 mt-6 leading-relaxed max-w-xs mx-auto">
          By signing in, you agree to our <button type="button" onClick={() => setShowTerms(true)} className="underline hover:text-gray-900 dark:hover:text-white">Terms of Service</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="underline hover:text-gray-900 dark:hover:text-white">Privacy Policy</button>
        </p>
      </form>
    </div>
  );
};

export default Login;
