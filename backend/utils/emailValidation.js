const dns = require('dns').promises;
const { parse } = require('tldts');

/**
 * Format the email by trimming and converting to lowercase.
 */
const formatEmail = (email) => {
  if (!email) return email;
  return email.trim().toLowerCase().replace(/\s/g, '');
};

/**
 * Validates the email syntax and TLD using tldts.
 */
const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: "Email address is required." };
  }

  if (email.length > 254) {
    return { isValid: false, error: "Enter a valid email address." };
  }

  // Reject Emojis / Unicode / SQL / HTML / Control characters
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

  // Local part strict characters: Letters, numbers, ., _, -, +
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

  // Use tldts to verify if the TLD is officially registered in the IANA root zone database.
  // parse() returns isIcann (true if it is in the ICANN section of the public suffix list).
  const parsedDomain = parse(domainPart);
  if (!parsedDomain.isIcann) {
    return { isValid: false, error: "The email domain extension is not recognized." };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates that the domain exists using a DNS lookup.
 */
const validateDomain = async (domain) => {
  try {
    // dns.lookup resolves hostnames (A/AAAA records)
    await dns.lookup(domain);
    return { isValid: true, error: "" };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ESERVFAIL') {
      return { isValid: false, error: "The email domain does not exist." };
    }
    // Network issues or other errors, we err on the side of caution or accept it.
    // For strict enterprise, if we can't verify, we reject.
    return { isValid: false, error: "The email domain does not exist." };
  }
};

/**
 * Validates that the domain has valid MX records.
 */
const validateMX = async (domain) => {
  try {
    const addresses = await dns.resolveMx(domain);
    if (!addresses || addresses.length === 0) {
      return { isValid: false, error: "This domain cannot receive emails." };
    }
    return { isValid: true, error: "" };
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      return { isValid: false, error: "This domain cannot receive emails." };
    }
    // If the server has a network issue (e.g. ECONNREFUSED, ETIMEDOUT),
    // we should let it pass so we don't block legitimate users.
    return { isValid: true, error: "" };
  }
};

module.exports = {
  formatEmail,
  validateEmail,
  validateDomain,
  validateMX
};
