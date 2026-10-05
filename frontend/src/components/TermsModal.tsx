import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface TermsModalProps {
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => {
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
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Terms of Service</h3>
        
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 mb-8 text-[14px] text-gray-600 dark:text-gray-400 space-y-5 font-medium leading-relaxed">
          <p>Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h4>
            <p>By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. User Accounts and Responsibilities</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate, complete, and current registration information.</li>
              <li>You are responsible for safeguarding the password that you use to access the service.</li>
              <li>You agree not to disclose your password to any third party.</li>
              <li>You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Acceptable Use Policy</h4>
            <p>You agree not to use the Service to post or transmit any material which is or may be infringing on intellectual property rights, harassing, threatening, false, misleading, inflammatory, libelous, invasive of privacy, or obscene.</p>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Termination</h4>
            <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. Limitation of Liability</h4>
            <p>In no event shall the platform, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
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

export default TermsModal;
