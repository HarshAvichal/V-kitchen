// Phone number formatting utilities

/**
 * Formats a phone number to US standard format: (XXX) XXX-XXXX
 * @param {string} value - The phone number string
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (value) => {
  // Handle null, undefined, or non-string values
  if (!value || typeof value !== 'string') return '';
  
  // Remove all non-digit characters
  let phoneNumber = value.replace(/\D/g, '');
  
  // Don't format if empty
  if (!phoneNumber) return '';
  
  // Remove leading "1" if it exists and we have 11 digits (US country code)
  if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
    phoneNumber = phoneNumber.slice(1);
  }
  
  // Don't format if it's not a US number (more than 10 digits after removing country code)
  if (phoneNumber.length > 10) {
    return value; // Return as-is for international numbers
  }
  
  // Format as US number: (XXX) XXX-XXXX
  const match = phoneNumber.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (match) {
    const [, area, exchange, number] = match;
    if (number) {
      return `(${area}) ${exchange}-${number}`;
    } else if (exchange) {
      return `(${area}) ${exchange}`;
    } else if (area) {
      return `(${area}`;
    }
  }
  
  return phoneNumber;
};

/**
 * Validates a US phone number
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - True if valid US phone number
 */
export const validatePhoneNumber = (phoneNumber) => {
  // Handle null, undefined, or non-string values
  if (!phoneNumber || typeof phoneNumber !== 'string') return false;
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // US phone numbers should be exactly 10 digits
  return /^\d{10}$/.test(cleaned);
};

/**
 * Cleans a phone number by removing formatting characters and country code
 * @param {string} phoneNumber - The formatted phone number
 * @returns {string} - Clean phone number with only digits (10 digits for US)
 */
export const cleanPhoneNumber = (phoneNumber) => {
  // Handle null, undefined, or non-string values
  if (!phoneNumber || typeof phoneNumber !== 'string') return '';
  
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Remove leading "1" if it exists and we have 11 digits (US country code)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.slice(1);
  }
  
  return cleaned;
};
