/**
 * Funções utilitárias de formatação, data e clipboard
 */

/**
 * Formata um número para moeda BRL (ex: 850 -> "850,00" ou 1500 -> "1.500,00")
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

  // Se já estiver formatado como pt-BR (ex: "1.500,00" ou "850,00")
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(str) || /^\d+,\d{2}$/.test(str)) {
    return str;
  }

  // Se tiver vírgula decimal simples (ex: "850,5")
  if (/^\d+,\d+$/.test(str)) {
    const [intPart, decPart] = str.split(',');
    const paddedDec = (decPart + '00').slice(0, 2);
    const numInt = parseInt(intPart, 10);
    return `${numInt.toLocaleString('pt-BR')},${paddedDec}`;
  }

  // Caso seja número com ponto ou inteiro puro (ex: "1500", "850", "1500.00")
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
 * Converte um objeto Date em string YYYY-MM-DD usando métodos locais (evita drift de fuso horário)
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
 * Converte data YYYY-MM-DD para DD/MM
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
 * Calcula a quantidade de diárias entre check-in e check-out
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
 * Formata número com zero à esquerda (ex: 2 -> "02")
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
 * Copia texto para a área de transferência com fallback
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores antigos ou contextos não-seguros
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Erro ao copiar texto:', err);
    return false;
  }
}
