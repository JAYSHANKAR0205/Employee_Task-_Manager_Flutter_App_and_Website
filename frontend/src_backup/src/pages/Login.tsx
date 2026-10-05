import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginProps {
  onSwitch?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitch }) => {
  const [data, setData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any pending forgot password or registration OTP states
    sessionStorage.removeItem('forgot_password_step');
    sessionStorage.removeItem('forgot_password_data');
    sessionStorage.removeItem('forgot_password_otp_timer');
    sessionStorage.removeItem('register_show_otp');
    sessionStorage.removeItem('register_form_data');
    sessionStorage.removeItem('register_errors');
    sessionStorage.removeItem('registration_otp_timer');
    localStorage.removeItem('forgot_password_otp_timer');
    localStorage.removeItem('registration_otp_timer');

    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setData({ email: savedEmail, password: savedPassword });
      setRememberMe(true);
    }
  }, []);

  const validateField = (name: string, value: string) => {
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
        return null;
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};
    let isValid = true;
    if (!data.email) { newErrors.email = 'Email is required'; isValid = false; }
    else { const err = validateField('email', data.email); if (err) { newErrors.email = err; isValid = false; } }
    if (!data.password) { newErrors.password = 'Password is required'; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalMessage({ type: '', text: '' });

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/users/login', data);
      localStorage.setItem('token', response.data.token);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
        localStorage.setItem('rememberedPassword', data.password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      setGlobalMessage({ type: 'success', text: 'Login successful!' });
      setTimeout(() => navigate('/dashboard'), 500); 
    } catch (err: any) {
      if (err.response && err.response.data) {
        if (err.response.data.validationErrors) {
          setErrors(err.response.data.validationErrors);
        } else if (err.response.data.error) {
          setGlobalMessage({ type: 'error', text: err.response.data.error });
        }
      } else {
        setGlobalMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = !!data.email.trim() && !!data.password;

  return (
    <div className="w-full flex flex-col justify-center items-center">
      
      {/* Header Section */}
      <div className="w-full flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 mb-4 flex items-center justify-center bg-forest dark:bg-sand/10 rounded-2xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-forest dark:text-sand">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zM12 22v-6"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
        <p className="text-base text-gray-900 dark:text-white/70">Sign in to your account</p>
      </div>

      {globalMessage.text && (
        <div className={`w-full p-4 rounded-lg mb-6 text-center text-sm font-medium border ${globalMessage.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'}`}>
          {globalMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
        
        {/* Email Field */}
        <div className="w-full flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand">Email <span className="text-red-500">*</span></label>
          <div className={`flex items-center w-full px-4 py-3 rounded-lg border transition-all duration-200 bg-gray-50 dark:bg-white/5 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'}`}>
            <Mail className="w-5 h-5 text-gray-900 dark:text-white/50 mr-3 shrink-0" />
            <input 
              name="email" 
              value={data.email}
              onChange={handleChange} 
              placeholder="name@example.com"
              className="bg-transparent outline-none flex-1 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30"
              disabled={isLoading}
            />
          </div>
          {errors.email && <span className="text-red-600 dark:text-red-400 text-xs font-medium">{errors.email}</span>}
        </div>

        {/* Password Field */}
        <div className="w-full flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand">Password <span className="text-red-500">*</span></label>
          <div className={`flex items-center w-full px-4 py-3 rounded-lg border transition-all duration-200 bg-gray-50 dark:bg-white/5 ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-white/20 focus-within:border-forest dark:focus-within:border-sand'}`}>
            <Lock className="w-5 h-5 text-gray-900 dark:text-white/50 mr-3 shrink-0" />
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
               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <span className="text-red-600 dark:text-red-400 text-xs font-medium">{errors.password}</span>}
        </div>

        {/* Remember Me & Forgot Password Row */}
        <div className="w-full flex items-center justify-between mt-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-forest dark:bg-sand border-sand' : 'border-gray-400 dark:border-white/40 group-hover:border-forest dark:group-hover:border-sand'}`}>
              {rememberMe && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-white dark:text-forest"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
              disabled={isLoading}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-white/80 group-hover:text-white transition-colors">Remember me</span>
          </label>
          <button 
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm font-bold text-forest dark:text-sand hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none"
            disabled={isLoading}
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <div className="w-full mt-4">
          <button 
            type="submit" 
            disabled={isLoading || !isFormValid}
            className="w-full py-3.5 bg-forest dark:bg-sand text-white dark:text-forest rounded-lg text-base font-bold transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </div>

        {/* Create Account Link */}
        <div className="text-center mt-2 text-gray-900 dark:text-white/70 text-sm font-medium">
          Don't have an account?{' '}
          <button 
            type="button" 
            onClick={onSwitch} 
            disabled={isLoading}
            className="font-bold text-forest dark:text-sand hover:underline focus:outline-none disabled:opacity-50"
          >
            Create Account
          </button>
        </div>

      </form>
    </div>
  );
};

export default Login;