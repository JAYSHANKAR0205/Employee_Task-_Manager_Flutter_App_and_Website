import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import OtpInput from '../components/OtpInput';
import { usePersistentTimer } from '../hooks/usePersistentTimer';

const Verify: React.FC = () => {
  const [data, setData] = useState({ email: '', otp: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [globalMessage, setGlobalMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { timeLeft, startTimer } = usePersistentTimer('registration_otp_timer', 60);

  useEffect(() => {
    // Automatically start timer if not already running
    if (timeLeft === 0 && !localStorage.getItem('registration_otp_timer')) {
      startTimer();
    }
  }, [timeLeft, startTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleOtpChange = (val: string) => {
    setData({ ...data, otp: val });
    if (errors.otp) {
      setErrors({ ...errors, otp: null });
    }
  };

  const handleResend = () => {
    // In a real app, call API to resend OTP here
    startTimer();
    setGlobalMessage({ type: 'success', text: 'OTP resent successfully.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalMessage({ type: '', text: '' });
    setIsLoading(true);

    if (!data.email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      setIsLoading(false);
      return;
    }
    if (!data.otp || data.otp.length < 6) {
      setErrors(prev => ({ ...prev, otp: '6-digit OTP is required' }));
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/users/verify', data);
      setGlobalMessage({ type: 'success', text: response.data.message });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setIsLoading(false);
      if (err.response && err.response.data && err.response.data.error) {
        setGlobalMessage({ type: 'error', text: err.response.data.error });
      } else {
        setGlobalMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-mint flex items-center justify-center p-4 font-sans relative">
      <ThemeToggle />
      <div className="w-full max-w-lg bg-white dark:bg-forest md:rounded-[2.5rem] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col transition-all duration-500">
        <div className="flex flex-col p-6 md:p-10 custom-scrollbar max-h-[90vh] overflow-y-auto items-center">
          
          <div className="text-center mb-10 mt-4">
            <div className="w-16 h-16 bg-forest dark:bg-sand rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
              <ShieldCheck className="w-8 h-8 text-white dark:text-forest" />
            </div>
            <h2 className="text-2xl font-bold text-forest dark:text-sand mb-2 tracking-wide">Verify Email</h2>
            <p className="text-xs text-forest/70 dark:text-sand/80 font-medium">Enter the 6-digit OTP sent to your inbox</p>
          </div>

          {globalMessage.text && (
            <div className={`w-full p-4 rounded-lg mb-6 text-center text-sm font-medium border ${globalMessage.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'}`}>
              {globalMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            
            {/* Email Field */}
            <div className="w-full flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand ml-1">Email Address</label>
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

            {/* OTP Field */}
            <div className="w-full flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-forest dark:text-sand ml-1">6-Digit OTP</label>
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
              className="w-full py-4 bg-forest dark:bg-sand text-white dark:text-forest rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-300 mt-4 h-16 flex items-center justify-center hover:bg-forest/90 dark:hover:bg-white shadow-lg hover:shadow-xl"
              disabled={isLoading || data.otp.length < 6}
            >
              Verify Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Verify;
