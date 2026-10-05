import CryptoJS from 'crypto-js';

const ENCRYPTION_SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'Mobiloi_Secure_Payload_Key_2026!#$';

/**
 * Encrypts plain-text password using AES-256 before sending over the network payload.
 */
export const encryptPassword = (password: string): string => {
  if (!password) return password;
  try {
    return CryptoJS.AES.encrypt(password, ENCRYPTION_SECRET).toString();
  } catch (error) {
    console.error('Password encryption error:', error);
    return password;
  }
};
