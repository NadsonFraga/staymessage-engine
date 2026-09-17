/**
 * StayMessage Engine — Message Builder Module
 * Pure message synthesis for WhatsApp quotations and data collection requests
 */

import { formatDateDDMM, formatMoney, padZero } from './utils.js';

/**
 * Builds the quotation message for standard stays or Day Use with Chalet
 * @param {Object} state - Global application state
 * @param {Object} profile - Active establishment profile
 * @param {Function} isUnitBlockedByPolicy - Helper to check if a unit is locked by child restrictions
 * @returns {string} Formatted WhatsApp markdown string
 */
export function buildBudgetMessage(state, profile, isUnitBlockedByPolicy) {
  const budgetTemplates = profile.messageTemplates.budget;
  const templateConfig = state.activeTab === 'dayuse_chale' 
    ? budgetTemplates.dayuse_chale 
    : budgetTemplates.padrao;

  const labels = budgetTemplates.labels || {
    unavailable: 'Indisponível',
    blockedByPolicy: 'Não permite crianças',
    onDemand: 'A consultar'
  };

  const checkinDDMM = formatDateDDMM(state.budget.checkin);
  const checkoutDDMM = formatDateDDMM(state.budget.checkout);
  const totalGuests = state.budget.adults + state.budget.children;
  const totalGuestsStr = padZero(totalGuests);

  // Group accommodations by category
  const categoryGroups = {};
  profile.accommodations.forEach(unit => {
    const cat = unit.category || 'OUTROS';
    if (!categoryGroups[cat]) {
      categoryGroups[cat] = [];
    }
    categoryGroups[cat].push(unit);
  });

  // Determine category rendering order
  let orderedCategories = budgetTemplates.categoryOrder || Object.keys(categoryGroups);
  // Ensure any category present in accommodations is rendered even if omitted from categoryOrder
  Object.keys(categoryGroups).forEach(cat => {
    if (!orderedCategories.includes(cat)) {
      orderedCategories.push(cat);
    }
  });

  // Format unit lines within each category
  const categorySections = [];

  orderedCategories.forEach(cat => {
    const units = categoryGroups[cat];
    if (!units || units.length === 0) return;

    const categoryHeader = budgetTemplates.categoryHeaders?.[cat] || `*${cat}:*`;
    const lines = units.map(unit => {
      let priceText = '';
      if (state.budget.unavailable[unit.id]) {
        priceText = labels.unavailable;
      } else if (isUnitBlockedByPolicy && isUnitBlockedByPolicy(unit.id)) {
        priceText = labels.blockedByPolicy;
      } else {
        const val = state.budget.values[unit.id];
        const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
        if (isEmpty) {
          priceText = labels.onDemand;
        } else {
          priceText = `${profile.meta.currencySymbol || 'R$'} ${formatMoney(val)}`;
        }
      }
      return `*${unit.name}:* ${priceText}`;
    });

    categorySections.push(`${categoryHeader}\n${lines.join('\n')}`);
  });

  return `${templateConfig.header}

${checkinDDMM} a ${checkoutDDMM} (${totalGuestsStr} pessoas)
➡️Entrada: ${templateConfig.checkinTime}
⬅️Saída: ${templateConfig.checkoutTime}

${categorySections.join('\n\n')}`;
}

/**
 * Builds the guest registration / data collection message for Day Use
 * @param {Object} state - Global application state
 * @param {Object} profile - Active establishment profile
 * @returns {string} Formatted WhatsApp markdown string
 */
export function buildDayUseDataMessage(state, profile) {
  const dayUseTemplates = profile.messageTemplates.dayUseData || {
    header: '*DADOS PARA DAY-USE*',
    labels: { paying: 'Pagante', exempt: 'Não pagante' }
  };

  const labels = dayUseTemplates.labels || { paying: 'Pagante', exempt: 'Não pagante' };
  const dateDDMM = formatDateDDMM(state.dayUseData.date);
  const adults = parseInt(state.dayUseData.adults, 10) || 0;
  const payingChildren = (state.dayUseData.childrenList || []).filter(c => !c.isExempt).length || 0;
  const totalPayers = Math.max(0, adults + payingChildren);
  const price = parseFloat(state.dayUseData.pricePerPerson) || 0;
  const rawTotal = totalPayers * price;
  const totalPrice = (!isNaN(rawTotal) && rawTotal >= 0) ? rawTotal : 0;
  const phoneText = state.dayUseData.phone ? state.dayUseData.phone.trim() : '';

  const blocks = [];
  let blockCounter = 1;

  // Block 01 - Primary Guest (Titular)
  blocks.push(`*${padZero(blockCounter)}*
NOME:
CPF:
NASCIMENTO:
EMAIL:`);
  blockCounter++;

  // Following adult blocks
  for (let i = 2; i <= state.dayUseData.adults; i++) {
    blocks.push(`*${padZero(blockCounter)}*
NOME:
CPF:
NASCIMENTO:`);
    blockCounter++;
  }

  // Children blocks
  state.dayUseData.childrenList.forEach((child) => {
    const statusText = child.isExempt ? labels.exempt : labels.paying;
    const ageLabel = child.age !== undefined ? ` (${child.age} anos)` : '';
    blocks.push(`*${padZero(blockCounter)} - Criança${ageLabel}*
NOME:
CPF:
NASCIMENTO:
${statusText}`);
    blockCounter++;
  });

  const formattedBlocks = blocks.join('\n\n');

  return `${dayUseTemplates.header}

DATA: ${dateDDMM}
VALOR: ${profile.meta.currencySymbol || 'R$'} ${formatMoney(totalPrice)}
VALOR PAGO: 
TEL: ${phoneText}

${formattedBlocks}`;
}
