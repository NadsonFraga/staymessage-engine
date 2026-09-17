/**
 * StayMessage Engine — Utility Helpers
 * Pure mathematical, formatting, and clipboard utilities
 */

/**
 * Formats a number or string into Brazilian Real currency string (ex: 850 -> "850,00", 1500 -> "1.500,00")
 * @param {number|string} val 
 * @returns {string}
 */
export function formatMoney(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  let str = String(val).trim().replace(/^R\$\s*/i, '');
  if (!str) return '';

  // Already formatted as pt-BR (ex: "1.500,00" or "850,00")
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(str) || /^\d+,\d{2}$/.test(str)) {
    return str;
  }

  // Comma decimal without thousand separator (ex: "850,5")
  if (/^\d+,\d+$/.test(str)) {
    const [intPart, decPart] = str.split(',');
    const paddedDec = (decPart + '00').slice(0, 2);
    const numInt = parseInt(intPart, 10);
    return `${numInt.toLocaleString('pt-BR')},${paddedDec}`;
  }

  // Plain number with dot or integer (ex: "1500", "850", "1500.00")
  const num = parseFloat(str.replace(/\./g, ''));
  if (!isNaN(num)) {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return str;
}

/**
 * Converts a Date object into YYYY-MM-DD string using local time methods (prevents UTC timezone drift)
 * @param {Date} date
 * @returns {string}
 */
export function formatLocalDateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts ISO date string YYYY-MM-DD to DD/MM
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDateDDMM(dateStr) {
  if (!dateStr) return '__/__';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

/**
 * Calculates the number of nights between check-in and check-out
 * @param {string} checkinStr - YYYY-MM-DD
 * @param {string} checkoutStr - YYYY-MM-DD
 * @returns {number}
 */
export function calculateNights(checkinStr, checkoutStr) {
  if (!checkinStr || !checkoutStr) return 0;
  const d1 = new Date(checkinStr + 'T00:00:00');
  const d2 = new Date(checkoutStr + 'T00:00:00');
  const diffTime = d2 - d1;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Left-pads a number with zeros (ex: 2 -> "02")
 * @param {number|string} num 
 * @param {number} size 
 * @returns {string}
 */
export function padZero(num, size = 2) {
  let s = String(num || 0);
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Copies text string to clipboard with fallback
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('StayMessage Engine: Clipboard API error, falling back to execCommand:', err);
    }
  }

  // Fallback using textarea element
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('StayMessage Engine: Clipboard fallback failed:', err);
    return false;
  }
}
