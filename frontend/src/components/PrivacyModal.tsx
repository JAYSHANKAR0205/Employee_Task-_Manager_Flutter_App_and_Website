import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PrivacyModalProps {
  onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const leftPanel = document.getElementById('auth-left-panel');
    if (leftPanel) leftPanel.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      if (leftPanel) leftPanel.style.overflow = '';
    };
  }, []);
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1a1a1a] p-8 md:p-10 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 dark:border-gray-800 max-h-[85vh] flex flex-col"
      >
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Privacy Policy</h3>
        
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 mb-8 text-[14px] text-gray-600 dark:text-gray-400 space-y-5 font-medium leading-relaxed">
          <p>Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Information We Collect</h4>
            <p>When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number. We also securely collect and store your date of birth, gender, and qualification strictly for verification and account personalization purposes.</p>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. How We Use Your Information</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, operate, and maintain our website.</li>
              <li>Improve, personalize, and expand our website.</li>
              <li>Understand and analyze how you use our website.</li>
              <li>Develop new products, services, features, and functionality.</li>
              <li>Communicate with you for customer service, updates, and marketing.</li>
              <li>Find and prevent fraud.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Data Security</h4>
            <p>We are committed to securing your data and keeping it confidential. We have done all in our power to prevent data theft, unauthorized access, and disclosure by implementing the latest technologies and software, which help us safeguard all the information we collect online. However, remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable.</p>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Log Files and Cookies</h4>
            <p>Our platform follows a standard procedure of using log files and cookies to log visitors. The information collected includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.</p>
          </div>
        </div>

        <button 
          type="button"
          onClick={onClose}
          className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-[15px]"
        >
          I Understand & Close
        </button>
      </motion.div>
    </motion.div>
  );
};

export default PrivacyModal;
