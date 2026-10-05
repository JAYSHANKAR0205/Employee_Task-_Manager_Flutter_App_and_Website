const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Validates international phone numbers in E.164 format.
 * Supports all global country calling codes including North American (+1) countries (US, Canada, Caribbean islands).
 */
const  validatePhone = (phoneNumber) => {
  if (!phoneNumber) return { isValid: false, error: 'Phone number is required.' };

  let cleaned = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');

  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return { isValid: false, error: 'Must be a valid E.164 phone number containing only numbers and a leading +.' };
  }

  // Handling for +1 (North American Numbering Plan - US, Canada, Bahamas, Jamaica, Barbados, etc.)
  if (cleaned.startsWith('+1')) {
    const nationalDigits = cleaned.slice(2);
    if (!/^[2-9]\d{9}$/.test(nationalDigits)) {
      return { isValid: false, error: 'Phone number for +1 countries must be 10 digits starting with an area code 2-9.' };
    }
    return { isValid: true, formatted: cleaned };
  }

  const phoneNumberObj = parsePhoneNumberFromString(cleaned);
  
  if (!phoneNumberObj) {
    return { isValid: false, error: 'Invalid phone number format.' };
  }

  if (!phoneNumberObj.isPossible() && !phoneNumberObj.isValid()) {
    return { isValid: false, error: 'The phone number provided is not a valid number for its country/region.' };
  }

  return { isValid: true, formatted: phoneNumberObj.format('E.164') };
};

module.exports = { validatePhone };
