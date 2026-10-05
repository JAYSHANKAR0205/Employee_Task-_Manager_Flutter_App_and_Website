export const formatName = (value: string, allowSpaces: boolean = false): string => {
  if (!value) return value;

  let formatted = value;

  if (allowSpaces) {
    // Replace multiple spaces with a single space
    formatted = formatted.replace(/\s{2,}/g, ' ');
    // Remove leading spaces
    formatted = formatted.replace(/^\s+/, '');
  } else {
    // Remove all spaces completely
    formatted = formatted.replace(/\s/g, '');
  }

  // Capitalize the first letter of every word (including after space, hyphen, or apostrophe)
  formatted = formatted.replace(/(?:^|[\s'-])\S/g, (match) => {
    return match.toUpperCase();
  });

  return formatted;
};

export const validateFirstName = (name: string): { isValid: boolean; error: string } => {
  if (!name) {
    return { isValid: false, error: 'First Name is required.' };
  }

  // Check for ANY spaces
  if (/\s/.test(name)) {
    return { isValid: false, error: 'Spaces are not allowed in First Name.' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'First Name must contain at least 2 characters.' };
  }

  if (name.length > 30) {
    return { isValid: false, error: 'First Name cannot exceed 30 characters.' };
  }

  // Allow only letters, hyphens, and apostrophes (NO spaces)
  if (!/^[A-Za-z\-\']+$/.test(name)) {
    return { isValid: false, error: "Only letters, hyphens (-), and apostrophes (') are allowed." };
  }

  // Check for consecutive hyphens or apostrophes
  if (/--|''|'-|-'/.test(name)) {
    return { isValid: false, error: 'First Name cannot contain consecutive special characters.' };
  }

  // Check if starts or ends with hyphen, or apostrophe
  if (/^[\-\']|[\-\']$/.test(name)) {
    return { isValid: false, error: 'First Name cannot start or end with a hyphen or apostrophe.' };
  }

  return { isValid: true, error: '' };
};

export const validateLastName = (name: string): { isValid: boolean; error: string } => {
  if (!name) {
    return { isValid: false, error: 'Last Name is required.' };
  }

  // Check for leading or trailing spaces
  if (/^\s|\s$/.test(name)) {
    return { isValid: false, error: 'Leading or trailing spaces are not allowed.' };
  }

  // Check for multiple spaces
  if (/\s{2,}/.test(name)) {
    return { isValid: false, error: 'Multiple spaces are not allowed.' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Last Name must contain at least 2 characters.' };
  }

  if (name.length > 30) {
    return { isValid: false, error: 'Last Name cannot exceed 30 characters.' };
  }

  // Allow only letters, single spaces, hyphens, and apostrophes
  if (!/^[A-Za-z\s\-\']+$/.test(name)) {
    return { isValid: false, error: "Only letters, single spaces, hyphens (-), and apostrophes (') are allowed." };
  }

  // Check for consecutive hyphens or apostrophes
  if (/--|''|'-|-'/.test(name)) {
    return { isValid: false, error: 'Last Name cannot contain consecutive special characters.' };
  }

  // Check if starts or ends with hyphen, or apostrophe
  if (/^[\-\']|[\-\']$/.test(name)) {
    return { isValid: false, error: 'Last Name cannot start or end with a hyphen or apostrophe.' };
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
    return { isValid: false, error: "Email address is required." };
  }

  if (email.length > 254) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  // Reject Emojis / Unicode / SQL / HTML
  const securityPattern = /[\x00-\x1F<>'";=]|OR\b|AND\b/i;
  const nonAsciiPattern = /[^\x00-\x7F]/;
  if (securityPattern.test(email) || nonAsciiPattern.test(email)) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  const [localPart, domainPart] = parts;

  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  if (domainPart.length === 0 || domainPart.length > 253) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  // Local part strict characters
  if (!/^[a-zA-Z0-9._\-+]+$/.test(localPart)) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  if (localPart.includes('..') || domainPart.includes('..')) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  if (!domainPart.includes('.')) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  const domainLabels = domainPart.split('.');
  for (const label of domainLabels) {
    if (label.length === 0 || label.startsWith('-') || label.endsWith('-')) {
      return { isValid: false, error: "Enter a valid email address." };
    }
  }

  // TLD validation using tldts
  const parsedDomain = parse(domainPart);
  if (!parsedDomain.isIcann) {
    return { isValid: false, error: "The email domain extension is not recognized." };
  }

  // Strict check for major providers to prevent typos like gmail.ashish.mc
  const domainPartLower = domainPart.toLowerCase();
  
  if (domainPartLower.includes('gmail')) {
    if (domainPartLower !== 'gmail.com') {
      return { isValid: false, error: "A valid Gmail address must end exactly with '@gmail.com'." };
    }
  }
  
  if (domainPartLower.includes('yahoo')) {
    const validYahoo = ['yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com'];
    if (!validYahoo.includes(domainPartLower)) {
      return { isValid: false, error: "Enter a valid official Yahoo domain." };
    }
  }

  if (domainPartLower.includes('outlook') || domainPartLower.includes('hotmail')) {
    const validMicrosoft = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
    if (!validMicrosoft.includes(domainPartLower)) {
      return { isValid: false, error: "Enter a valid official Microsoft domain." };
    }
  }

  return { isValid: true, error: "" };
};


import { parsePhoneNumberWithError, ParseError } from 'libphonenumber-js';

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  try {
    const phoneNumber = parsePhoneNumberWithError(phone);
    return phoneNumber.format('E.164');
  } catch (error) {
    return phone;
  }
};

export const validatePhoneNumber = (phone: string): { isValid: boolean; error: string; country: string; e164: string } => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required.', country: '', e164: '' };
  }
  
  // Reject HTML, JavaScript, SQL Injection
  const securityPattern = /[\x00-\x1F<>'";=]|OR\b|AND\b/i;
  if (securityPattern.test(phone)) {
    return { isValid: false, error: 'Enter a valid phone number.', country: '', e164: '' };
  }

  try {
    const phoneNumber = parsePhoneNumberWithError(phone);
    
    if (!phoneNumber.isValid()) {
      return { 
        isValid: false, 
        error: 'Phone number is not valid for the selected country.', 
        country: phoneNumber.country || '', 
        e164: '' 
      };
    }
    
    return { 
      isValid: true, 
      error: '', 
      country: phoneNumber.country || '', 
      e164: phoneNumber.format('E.164') 
    };
  } catch (error) {
    let errorMessage = 'Enter a valid phone number.';
    if (error instanceof ParseError) {
      switch (error.message) {
        case 'TOO_SHORT':
          errorMessage = 'Phone number is too short.';
          break;
        case 'TOO_LONG':
          errorMessage = 'Phone number is too long.';
          break;
        case 'INVALID_COUNTRY':
          errorMessage = 'Phone number is not valid for the selected country.';
          break;
        case 'NOT_A_NUMBER':
          errorMessage = 'Enter a valid phone number.';
          break;
        default:
          errorMessage = 'Phone number is not valid for the selected country.';
      }
    }
    return { isValid: false, error: errorMessage, country: '', e164: '' };
  }
};
