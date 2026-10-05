const CryptoJS = require('crypto-js');

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'Mobiloi_Secure_Payload_Key_2026!#$';

/**
 * Decrypts AES-256 encrypted password received over the network payload.
 */
const decryptPassword = (encryptedPassword) => {
  if (!encryptedPassword || typeof encryptedPassword !== 'string') return encryptedPassword;
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword,ENCRYPTION_SECRET);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (originalText) {
      return originalText;
    }
  } catch (e) {
    // Decryption failed or input was already plain text
  }

  return encryptedPassword;
};

module.exports = { decryptPassword };
