import { getCountryMaxLength } from './countryPhoneLengths';
export const formatName = (value: string, allowSpaces: boolean = false): string => {
  if (!value) return value;

  let formatted = value;

  if (allowSpaces) {
    // Remove characters that are NOT letters, space, hyphen, or apostrophe
    formatted = formatted.replace(/[^a-zA-Z\s\-']/g, '');
    // Replace multiple spaces with a single space
    formatted = formatted.replace(/\s{2,}/g, ' ');
    // Remove leading spaces
    formatted = formatted.replace(/^\s+/, '');
  } else {
    // Remove all spaces, numbers, and special characters completely
    formatted = formatted.replace(/[^a-zA-Z]/g, '');
  }

  // Capitalize the first letter of every word (including after space, hyphen, or apostrophe)
  formatted = formatted.replace(/(?:^|[\s'-])\S/g, (match) => {
    return match.toUpperCase();
  });

  return formatted;
};

export const validateFirstName = (name: string): { isValid: boolean; error: string } => {
  if (!name) {
    return { isValid: false, error: 'Please enter your first name.' };
  }

  // Check for ANY spaces
  if (/\s/.test(name)) {
    return { isValid: false, error: 'Please enter valid first name.' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Please enter valid first name.'};
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Please enter valid first name.' };
  }

  // Allow ONLY letters (backend rule: /^[A-Za-z]+$/)
  if (!/^[A-Za-z]+$/.test(name)) {
    return { isValid: false, error: "Please enter valid first name." };
  }

  return { isValid: true, error: '' };
};

export const validateLastName = (name: string): { isValid: boolean; error: string } => {
  if (!name) {
    return { isValid: false, error: 'Please enter your last name.' };
  }

  // Check for leading or trailing spaces
  if (/^\s/.test(name)) {
    return { isValid: false, error: 'Please enter valid last name.' };
  }
  if (/\s$/.test(name)) {
    return { isValid: false, error: 'Please enter valid last name.' };
  }

  // Check for multiple spaces
  if (/\s{2,}/.test(name)) {
    return { isValid: false, error: 'Please enter valid last name.' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Please enter valid last name.' };
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Please enter valid last name.' };
  }

  // Allow ONLY letters, single spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { isValid: false, error: "Please enter valid last name." };
  }

  return { isValid: true, error: '' };
};

import { parse } from 'tldts';

export const formatEmail = (email: string): string => {
  if (!email) return email;
  // Automatically trim whitespace, convert to lowercase, and remove internal spaces
  return email.trim().toLowerCase().replace(/\s/g, '');
};

export const validateEmail = (email: string): { isValid: boolean; error: string } => {
  if (!email) {
    return { isValid: false, error: "Please enter your email." };
  }

  if (email.length > 254) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  // Reject Emojis / Unicode / SQL / HTML
  const securityPattern = /[\x00-\x1F<>'";=]|OR\b|AND\b/i;
  const nonAsciiPattern = /[^\x00-\x7F]/;
  if (securityPattern.test(email) || nonAsciiPattern.test(email)) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  const [localPart, domainPart] = parts;

  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  if (domainPart.length === 0 || domainPart.length > 253) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  // Local part strict characters
  if (!/^[a-zA-Z0-9._\-+]+$/.test(localPart)) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  if (localPart.includes('..') || domainPart.includes('..')) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  if (!domainPart.includes('.')) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  const domainLabels = domainPart.split('.');
  for (const label of domainLabels) {
    if (label.length === 0 || label.startsWith('-') || label.endsWith('-')) {
      return { isValid: false, error: "Please enter a valid email." };
    }
  }

  // TLD validation using tldts
  const parsedDomain = parse(domainPart);
  if (!parsedDomain.isIcann) {
    return { isValid: false, error: "Please enter a valid email." };
  }

  // Strict check for major providers to prevent typos like gmail.ashish.mc
  const domainPartLower = domainPart.toLowerCase();
  
  if (domainPartLower.includes('gmail')) {
    if (domainPartLower !== 'gmail.com') {
      return { isValid: false, error: "Please enter a valid email." };
    }
  }
  
  if (domainPartLower.includes('yahoo')) {
    const validYahoo = ['yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com'];
    if (!validYahoo.includes(domainPartLower)) {
      return { isValid: false, error: "Please enter a valid email." };
    }
  }

  if (domainPartLower.includes('outlook') || domainPartLower.includes('hotmail')) {
    const validMicrosoft = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
    if (!validMicrosoft.includes(domainPartLower)) {
      return { isValid: false, error: "Please enter a valid email." };
    }
  }

  return { isValid: true, error: "" };
};


import { parsePhoneNumberWithError, getCountryCallingCode, CountryCode } from 'libphonenumber-js/mobile';

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  try {
    const phoneNumber = parsePhoneNumberWithError(phone);
    return phoneNumber.format('E.164');
  } catch (error) {
    return phone;
  }
};

export const validatePhoneNumber = (
  phone: string, 
  selectedCountryCode: string = 'US',
  isBlurEvent: boolean = false
): { isValid: boolean; error: string; country: string; e164: string } => {
  if (!phone) {
    return { 
      isValid: false, 
      error: isBlurEvent ? 'Please enter your phone number.' : '', 
      country: selectedCountryCode, 
      e164: '' 
    };
  }
  
  // Security check for malicious script characters
  const securityPattern = /[\x00-\x1F<>'";=]|OR\b|AND\b/i;
  if (securityPattern.test(phone)) {
    return { isValid: false, error: 'Please enter a valid phone number.', country: selectedCountryCode, e164: '' };
  }

  // Clean phone string
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  
  let callingCode = '1';
  try {
    callingCode = getCountryCallingCode(selectedCountryCode as CountryCode);
  } catch (e) {
    callingCode = '1';
  }

  const prefix = '+' + callingCode;
  
  // Extract national digits after country calling code prefix
  let nationalDigits = '';
  if (cleaned.startsWith(prefix)) {
    nationalDigits = cleaned.slice(prefix.length).replace(/\D/g, '');
  } else if (cleaned.startsWith('+')) {
    nationalDigits = cleaned.replace(/^\+\d{1,4}/, '').replace(/\D/g, '');
  } else {
    nationalDigits = cleaned.replace(/\D/g, '');
  }

  // Strip leading zero for non-US calling codes if present (e.g. 06200366054 -> 6200366054)
  if (callingCode !== '1' && nationalDigits.startsWith('0')) {
    nationalDigits = nationalDigits.replace(/^0+/, '');
  }

  const expectedLength = getCountryMaxLength(selectedCountryCode);

  // Special handling for +1 (North American Numbering Plan: US, CA, JM, BS, BB, TT, DO, PR, VI, etc.)
  if (callingCode === '1') {
    if (nationalDigits.length > 0 && !/^[2-9]/.test(nationalDigits)) {
      return { isValid: false, error: 'Area code cannot start with 0 or 1.', country: selectedCountryCode, e164: '' };
    }
    
    if (nationalDigits.length === 10) {
      return { isValid: true, error: '', country: selectedCountryCode, e164: prefix + nationalDigits };
    } else if (nationalDigits.length < 10) {
      return { 
        isValid: false, 
        error: isBlurEvent ? `Phone number for ${selectedCountryCode} must be 10 digits.` : '', 
        country: selectedCountryCode, 
        e164: '' 
      };
    } else {
      return { isValid: false, error: `Phone number for ${selectedCountryCode} must be 10 digits.`, country: selectedCountryCode, e164: '' };
    }
  }

  // All Other Global Countries (including shared calling codes like +44, +7, +61, +599, +262, +358, etc.)
  if (nationalDigits.length === expectedLength) {
    return { isValid: true, error: '', country: selectedCountryCode, e164: prefix + nationalDigits };
  } else if (nationalDigits.length < expectedLength) {
    return { 
      isValid: false, 
      error: isBlurEvent ? `Phone number for ${selectedCountryCode} must be ${expectedLength} digits.` : '', 
      country: selectedCountryCode, 
      e164: '' 
    };
  } else {
    return { 
      isValid: false, 
      error: `Phone number for ${selectedCountryCode} must be ${expectedLength} digits.`, 
      country: selectedCountryCode, 
      e164: '' 
    };
  }
};

export const validateBio = (bio: string): { isValid: boolean; error: string } => {
  if (!bio) return { isValid: true, error: '' };
  if (bio.length > 200) {
    return { isValid: false, error: 'Bio cannot exceed 200 characters.' };
  }
  if (/\s{2,}/.test(bio)) {
    return { isValid: false, error: 'Bio cannot contain continuous spaces.' };
  }
  if (!/^[a-zA-Z0-9\s,.\-()]*$/.test(bio)) {
    return { isValid: false, error: 'Only letters, numbers, spaces, commas, hyphens (-), brackets (), and full stops (.) are allowed.' };
  }
  return { isValid: true, error: '' };
};
