import { CONFIG } from './config.js';
import { formatMoney, formatDateDDMM, calculateNights, padZero, copyToClipboard, formatLocalDateISO } from './utils.js';
import { DateRangePicker } from './calendar.js';

// Estado global da aplicação
const state = {
  activeTab: 'padrao', // 'padrao' | 'dayuse_chale' | 'dados'
  client: CONFIG.clients[CONFIG.activeClientId],
  
  // Estado das Abas de Orçamento (Padrão e Day Use com Chalé)
  budget: {
    checkin: '',
    checkout: '',
    adults: 2,
    children: 0,
    values: {
      vista_lago: '',
      hortensia: '',
      sem_hidro: ''
    },
    unavailable: {
      vista_lago: false,
      hortensia: false,
      sem_hidro: false
    },
    // Exceções manuais para desbloquear hidro mesmo com crianças
    unlockedExceptions: {
      vista_lago: false,
      hortensia: false
    },
    manualEdits: {
      vista_lago: false,
      hortensia: false,
      sem_hidro: false
    }
  },

  // Estado da Aba 3: Solicitação de Dados
  dayUseData: {
    date: '',
    pricePerPerson: 65,
    adults: 2,
    children: 0,
    childrenList: [], // [{ id: 1, age: 5, isExempt: true, manualOverride: false }]
    phone: ''
  }
};

// Elementos DOM principais
const DOM = {
  // Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content-panel'),
  
  // Orçamento Comum
  budgetDateContainer: document.getElementById('budget-date-range-container'),
  btnBudgetCheckin: document.getElementById('btn-budget-checkin'),
  btnBudgetCheckout: document.getElementById('btn-budget-checkout'),
  budgetCheckin: document.getElementById('budget-checkin'),
  budgetCheckout: document.getElementById('budget-checkout'),
  budgetAdults: document.getElementById('budget-adults'),
  budgetChildren: document.getElementById('budget-children'),
  budgetNightsBadge: document.getElementById('budget-nights-badge'),
  budgetTotalGuestsBadge: document.getElementById('budget-total-guests-badge'),
  budgetTypeSelect: document.getElementById('budget-type-select'),
  
  // Chalés Inputs e Checkboxes
  chaleInputs: {
    vista_lago: document.getElementById('val-vista-lago'),
    hortensia: document.getElementById('val-hortensia'),
    sem_hidro: document.getElementById('val-sem-hidro')
  },
  chaleUnavailable: {
    vista_lago: document.getElementById('unavail-vista-lago'),
    hortensia: document.getElementById('unavail-hortensia'),
    sem_hidro: document.getElementById('unavail-sem-hidro')
  },
  chaleWarnings: {
    vista_lago: document.getElementById('warn-vista-lago'),
    hortensia: document.getElementById('warn-hortensia'),
    sem_hidro: document.getElementById('warn-sem-hidro')
  },
  chaleWrappers: {
    vista_lago: document.getElementById('wrapper-vista-lago'),
    hortensia: document.getElementById('wrapper-hortensia'),
    sem_hidro: document.getElementById('wrapper-sem-hidro')
  },
  
  // Aba 3 - Day Use Dados
  dayuseDateContainer: document.getElementById('dayuse-date-container'),
  btnDayuseDate: document.getElementById('btn-dayuse-date'),
  dayuseDate: document.getElementById('dayuse-date'),
  dayusePriceRadio: document.getElementsByName('dayuse-price'),
  dayuseAdults: document.getElementById('dayuse-adults'),
  dayuseChildren: document.getElementById('dayuse-children'),
  dayuseChildrenContainer: document.getElementById('children-cards-container'),
  dayusePhone: document.getElementById('dayuse-phone'),
  dayuseTotalBadge: document.getElementById('dayuse-total-badge'),
  dayusePayersCount: document.getElementById('dayuse-payers-count'),
  
  // Preview e Botão Copiar
  previewText: document.getElementById('preview-message-text'),
  copyBtn: document.getElementById('btn-copy-message'),
  copySuccessAlert: document.getElementById('copy-success-alert'),
  
  // Modal de Exceção Política de Crianças
  unlockModal: document.getElementById('unlock-modal'),
  unlockModalChaleName: document.getElementById('unlock-chale-name'),
  unlockModalConfirmBtn: document.getElementById('btn-modal-confirm-unlock'),
  unlockModalCancelBtn: document.getElementById('btn-modal-cancel-unlock'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

// Instâncias do DateRangePicker
let budgetPicker = null;
let dayusePicker = null;

/**
 * Inicialização da aplicação
 */
export function initApp() {
  setupInitialDates();
  setupDatePickers();
  setupDatalist();
  setupEventListeners();
  updateBudgetCalculations(true);
  updateDayUseChildrenList();
  renderPreview();
}

/**
 * Inicializa os pickers de calendário customizados
 */
function setupDatePickers() {
  if (DOM.budgetDateContainer) {
    budgetPicker = new DateRangePicker({
      container: DOM.budgetDateContainer,
      checkinBtn: DOM.btnBudgetCheckin,
      checkoutBtn: DOM.btnBudgetCheckout,
      checkinInput: DOM.budgetCheckin,
      checkoutInput: DOM.budgetCheckout,
      singleMode: false,
      allowSameDay: true, // Q2: Opção B (Permitir mesmo dia para Day Use)
      onSelect: (start, end) => {
        state.budget.checkin = start;
        state.budget.checkout = end;
        updateBudgetCalculations(false);
        renderPreview();
      }
    });
    budgetPicker.setDates(state.budget.checkin, state.budget.checkout);
  }

  if (DOM.dayuseDateContainer) {
    dayusePicker = new DateRangePicker({
      container: DOM.dayuseDateContainer,
      singleBtn: DOM.btnDayuseDate,
      singleInput: DOM.dayuseDate,
      singleMode: true, // Q5: Opção B (2 meses visíveis com clique único)
      allowSameDay: true,
      onSelect: (date) => {
        state.dayUseData.date = date;
        renderPreview();
      }
    });
    dayusePicker.setDates(state.dayUseData.date);
  }
}

/**
 * Define datas iniciais padrão da aplicação:
 * - Check-in: Data de hoje (Today)
 * - Check-out: Data de amanhã (Today + 1 dia)
 * - Day Use (Aba 3): Data de hoje (Today)
 *
 * Utiliza métodos de data local para evitar desvios de fuso horário (ex: UTC-3).
 */
function setupInitialDates() {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  state.budget.checkin = formatLocalDateISO(today);
  state.budget.checkout = formatLocalDateISO(tomorrow);
  state.dayUseData.date = formatLocalDateISO(today);

  if (DOM.budgetCheckin) DOM.budgetCheckin.value = state.budget.checkin;
  if (DOM.budgetCheckout) DOM.budgetCheckout.value = state.budget.checkout;
  if (DOM.dayuseDate) DOM.dayuseDate.value = state.dayUseData.date;

  if (budgetPicker) budgetPicker.setDates(state.budget.checkin, state.budget.checkout);
  if (dayusePicker) dayusePicker.setDates(state.dayUseData.date);
}

/**
 * Popula os datalists de valores com as opções de config
 */
function setupDatalist() {
  const datalist = document.getElementById('datalist-valores');
  if (!datalist) return;
  datalist.innerHTML = '';
  state.client.datalistValues.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.label = `R$ ${formatMoney(val)}`;
    datalist.appendChild(opt);
  });
}

/**
 * Configuração dos Event Listeners
 */
function setupEventListeners() {
  // Troca de Abas
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;
      setActiveTab(tabTarget);
    });
  });

  // Mudança de tipo de orçamento via select (sincronizado com as abas 1 e 2)
  if (DOM.budgetTypeSelect) {
    DOM.budgetTypeSelect.addEventListener('change', (e) => {
      setActiveTab(e.target.value);
    });
  }

  // Inputs do Orçamento
  if (DOM.budgetCheckin) {
    DOM.budgetCheckin.addEventListener('change', (e) => {
      state.budget.checkin = e.target.value;
      updateBudgetCalculations(false);
      renderPreview();
    });
  }

  if (DOM.budgetCheckout) {
    DOM.budgetCheckout.addEventListener('change', (e) => {
      state.budget.checkout = e.target.value;
      updateBudgetCalculations(false);
      renderPreview();
    });
  }

  if (DOM.budgetAdults) {
    DOM.budgetAdults.addEventListener('input', (e) => {
      state.budget.adults = Math.max(1, parseInt(e.target.value) || 1);
      updateBudgetCalculations(false);
      renderPreview();
    });
  }

  if (DOM.budgetChildren) {
    DOM.budgetChildren.addEventListener('input', (e) => {
      const prevChildren = state.budget.children;
      state.budget.children = Math.max(0, parseInt(e.target.value) || 0);
      
      // Se crianças voltaram para 0, reseta exceções de desbloqueio
      if (state.budget.children === 0) {
        state.budget.unlockedExceptions.vista_lago = false;
        state.budget.unlockedExceptions.hortensia = false;
      }
      
      updateBudgetCalculations(false);
      renderPreview();
    });
  }

  // Inputs dos Chalés
  ['vista_lago', 'hortensia', 'sem_hidro'].forEach(chaleId => {
    const inputEl = DOM.chaleInputs[chaleId];
    const unavailEl = DOM.chaleUnavailable[chaleId];
    const wrapperEl = DOM.chaleWrappers[chaleId];

    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        state.budget.values[chaleId] = e.target.value;
        state.budget.manualEdits[chaleId] = true;
        renderPreview();
      });

      // Tentativa de focar/editar em campo bloqueado por crianças
      inputEl.addEventListener('click', () => {
        const isHydro = (chaleId === 'vista_lago' || chaleId === 'hortensia');
        const isBlockedByChildren = isHydro && state.budget.children > 0 && !state.budget.unlockedExceptions[chaleId];
        
        if (isBlockedByChildren) {
          openUnlockModal(chaleId);
        }
      });
    }

    if (unavailEl) {
      unavailEl.addEventListener('change', (e) => {
        state.budget.unavailable[chaleId] = e.target.checked;
        if (inputEl) {
          inputEl.disabled = e.target.checked || isFieldBlockedByChildren(chaleId);
        }
        renderPreview();
      });
    }
  });

  // Botões de Confirmação do Modal de Exceção
  let currentUnlockTarget = null;
  function openUnlockModal(chaleId) {
    currentUnlockTarget = chaleId;
    const chaleObj = state.client.chales.find(c => c.id === chaleId);
    DOM.unlockModalChaleName.textContent = chaleObj ? chaleObj.name : chaleId;
    DOM.unlockModal.classList.add('active');
  }

  DOM.unlockModalConfirmBtn.addEventListener('click', () => {
    if (currentUnlockTarget) {
      state.budget.unlockedExceptions[currentUnlockTarget] = true;
      showToast(`Edição liberada para ${state.client.chales.find(c => c.id === currentUnlockTarget)?.label} (Exceção)`, 'warning');
      DOM.unlockModal.classList.remove('active');
      updateBudgetCalculations(false);
      DOM.chaleInputs[currentUnlockTarget].focus();
      renderPreview();
    }
  });

  DOM.unlockModalCancelBtn.addEventListener('click', () => {
    DOM.unlockModal.classList.remove('active');
    currentUnlockTarget = null;
  });

  // Inputs da Aba 3 (Day Use Solicitação de Dados)
  if (DOM.dayuseDate) {
    DOM.dayuseDate.addEventListener('change', (e) => {
      state.dayUseData.date = e.target.value;
      renderPreview();
    });
  }

  DOM.dayusePriceRadio.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.dayUseData.pricePerPerson = parseFloat(e.target.value);
        updateDayUseCalculations();
        renderPreview();
      }
    });
  });

  if (DOM.dayuseAdults) {
    DOM.dayuseAdults.addEventListener('input', (e) => {
      state.dayUseData.adults = Math.max(1, parseInt(e.target.value) || 1);
      updateDayUseCalculations();
      renderPreview();
    });
  }

  if (DOM.dayuseChildren) {
    DOM.dayuseChildren.addEventListener('input', (e) => {
      state.dayUseData.children = Math.max(0, parseInt(e.target.value) || 0);
      updateDayUseChildrenList();
      updateDayUseCalculations();
      renderPreview();
    });
  }

  if (DOM.dayusePhone) {
    DOM.dayusePhone.addEventListener('input', (e) => {
      state.dayUseData.phone = e.target.value;
      renderPreview();
    });
  }

  // Botão Copiar Mensagem
  DOM.copyBtn.addEventListener('click', handleCopyMessage);
}

/**
 * Define a aba ativa
 */
export function setActiveTab(tabId) {
  state.activeTab = tabId;

  // Fecha calendários abertos ao alternar de aba
  if (budgetPicker && budgetPicker.isOpen) budgetPicker.close(true);
  if (dayusePicker && dayusePicker.isOpen) dayusePicker.close(true);

  DOM.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  DOM.tabContents.forEach(panel => {
    if (tabId === 'padrao' || tabId === 'dayuse_chale') {
      panel.classList.toggle('active', panel.id === 'tab-panel-budget');
    } else {
      panel.classList.toggle('active', panel.id === 'tab-panel-dayuse-data');
    }
  });

  if (DOM.budgetTypeSelect) {
    if (tabId === 'padrao' || tabId === 'dayuse_chale') {
      DOM.budgetTypeSelect.value = tabId;
    }
  }

  renderPreview();
}

/**
 * Verifica se um campo está bloqueado pela política de crianças
 */
function isFieldBlockedByChildren(chaleId) {
  const isHydro = (chaleId === 'vista_lago' || chaleId === 'hortensia');
  return isHydro && state.budget.children > 0 && !state.budget.unlockedExceptions[chaleId];
}

/**
 * Atualiza cálculos de diárias, total de pessoas e preenchimento automático
 */
function updateBudgetCalculations(forceAutoFill = false) {
  const totalGuests = state.budget.adults + state.budget.children;
  const nights = calculateNights(state.budget.checkin, state.budget.checkout);

  // Atualiza badges informativos
  if (DOM.budgetNightsBadge) {
    DOM.budgetNightsBadge.textContent = `${nights} ${nights === 1 ? 'diária' : 'diárias'}`;
  }
  if (DOM.budgetTotalGuestsBadge) {
    DOM.budgetTotalGuestsBadge.textContent = `${padZero(totalGuests)} ${totalGuests === 1 ? 'hóspede' : 'hóspedes'}`;
  }

  // Preenchimento automático inteligente: 1 ou 2 pessoas E 1 ou 2 diárias
  const isEligibleForAutoFill = (totalGuests === 1 || totalGuests === 2) && (nights === 1 || nights === 2);

  ['vista_lago', 'hortensia', 'sem_hidro'].forEach(chaleId => {
    const inputEl = DOM.chaleInputs[chaleId];
    const wrapperEl = DOM.chaleWrappers[chaleId];
    const warnEl = DOM.chaleWarnings[chaleId];
    const chaleObj = state.client.chales.find(c => c.id === chaleId);
    const blockedByChildren = isFieldBlockedByChildren(chaleId);

    // Gestão de bloqueio pela política de crianças
    if (blockedByChildren) {
      inputEl.value = 'Não permite crianças';
      inputEl.classList.add('blocked-by-policy');
      inputEl.setAttribute('readonly', 'true');
      wrapperEl.classList.add('is-locked');
    } else {
      inputEl.classList.remove('blocked-by-policy');
      inputEl.removeAttribute('readonly');
      wrapperEl.classList.remove('is-locked');
      
      // Auto-preenchimento ou limpeza
      if (isEligibleForAutoFill) {
        if (!state.budget.manualEdits[chaleId] || forceAutoFill) {
          const autoVal = state.client.autoFillTable[nights][chaleId];
          state.budget.values[chaleId] = autoVal;
          inputEl.value = autoVal;
        }
      } else if (!state.budget.manualEdits[chaleId]) {
        // Fora das combinações e sem edição manual prévia
        if (inputEl.value === 'Não permite crianças' || forceAutoFill) {
          state.budget.values[chaleId] = '';
          inputEl.value = '';
        }
      }
    }

    // Gestão do checkbox de Indisponibilidade
    if (state.budget.unavailable[chaleId]) {
      inputEl.disabled = true;
      wrapperEl.classList.add('is-unavailable');
    } else {
      inputEl.disabled = false;
      wrapperEl.classList.remove('is-unavailable');
    }

    // Alerta de Limite de Ocupação (Informativo, não bloqueia)
    if (chaleObj && totalGuests > chaleObj.maxCapacity) {
      warnEl.textContent = `⚠️ Capacidade máx. recomendada: ${chaleObj.maxCapacity} pessoas (Total atual: ${totalGuests})`;
      warnEl.classList.add('show');
    } else {
      warnEl.textContent = '';
      warnEl.classList.remove('show');
    }
  });
}

/**
 * Atualiza lista dinâmica de crianças da Aba 3
 */
function updateDayUseChildrenList() {
  const currentCount = state.dayUseData.childrenList.length;
  const targetCount = state.dayUseData.children;

  if (targetCount > currentCount) {
    for (let i = currentCount + 1; i <= targetCount; i++) {
      state.dayUseData.childrenList.push({
        id: i,
        age: 5,
        isExempt: true,
        manualOverride: false
      });
    }
  } else if (targetCount < currentCount) {
    state.dayUseData.childrenList = state.dayUseData.childrenList.slice(0, targetCount);
  }

  // Recalcula isenções automáticas com base na idade e limite de 2
  recalculateDayUseExemptions();
  renderDayUseChildrenUI();
}

/**
 * Recalcula isenções da Aba 3 de acordo com as regras de negócio
 */
function recalculateDayUseExemptions() {
  let exemptCount = 0;
  const maxExempt = state.client.dayUseSettings.maxExemptChildren; // 2
  const maxExemptAge = state.client.dayUseSettings.maxExemptAge; // 7

  state.dayUseData.childrenList.forEach((child) => {
    if (!child.manualOverride) {
      if (child.age <= maxExemptAge && exemptCount < maxExempt) {
        child.isExempt = true;
        exemptCount++;
      } else {
        child.isExempt = false;
      }
    } else {
      if (child.isExempt) exemptCount++;
    }
  });
}

/**
 * Renderiza os cards de crianças no formulário da Aba 3
 */
function renderDayUseChildrenUI() {
  if (!DOM.dayuseChildrenContainer) return;
  DOM.dayuseChildrenContainer.innerHTML = '';

  if (state.dayUseData.childrenList.length === 0) {
    DOM.dayuseChildrenContainer.innerHTML = `<div class="empty-children-hint">Nenhuma criança adicionada.</div>`;
    return;
  }

  state.dayUseData.childrenList.forEach((child, index) => {
    const card = document.createElement('div');
    card.className = `child-card ${child.isExempt ? 'is-exempt' : 'is-paying'}`;
    
    card.innerHTML = `
      <div class="child-card-header">
        <span class="child-number">Criança #${padZero(index + 1)}</span>
        <span class="child-status-badge ${child.isExempt ? 'badge-exempt' : 'badge-paying'}">
          ${child.isExempt ? '🎉 Não pagante (Isenta)' : '💳 Pagante'}
        </span>
      </div>
      <div class="child-card-body">
        <div class="form-group-inline">
          <label for="child-age-${child.id}">Idade:</label>
          <input type="number" id="child-age-${child.id}" min="0" max="17" value="${child.age}" class="input-age" />
          <span class="unit-label">anos</span>
        </div>
        <div class="form-group-inline">
          <label>Status:</label>
          <select id="child-status-${child.id}" class="select-status">
            <option value="exempt" ${child.isExempt ? 'selected' : ''}>Não pagante (Isenta)</option>
            <option value="paying" ${!child.isExempt ? 'selected' : ''}>Pagante</option>
          </select>
        </div>
      </div>
    `;

    // Eventos dos inputs da criança
    const ageInput = card.querySelector(`#child-age-${child.id}`);
    const statusSelect = card.querySelector(`#child-status-${child.id}`);

    ageInput.addEventListener('input', (e) => {
      child.age = Math.max(0, parseInt(e.target.value) || 0);
      child.manualOverride = false; // Reset override ao mudar idade para sugerir automaticamente
      recalculateDayUseExemptions();
      renderDayUseChildrenUI();
      updateDayUseCalculations();
      renderPreview();
    });

    statusSelect.addEventListener('change', (e) => {
      child.isExempt = e.target.value === 'exempt';
      child.manualOverride = true; // Marca como override manual
      renderDayUseChildrenUI();
      updateDayUseCalculations();
      renderPreview();
    });

    DOM.dayuseChildrenContainer.appendChild(card);
  });
}

/**
 * Atualiza o cálculo do total do Day Use (Aba 3)
 */
function updateDayUseCalculations() {
  const payingChildren = state.dayUseData.childrenList.filter(c => !c.isExempt).length;
  const totalPayers = state.dayUseData.adults + payingChildren;
  const totalPrice = totalPayers * state.dayUseData.pricePerPerson;

  if (DOM.dayuseTotalBadge) {
    DOM.dayuseTotalBadge.textContent = `R$ ${formatMoney(totalPrice)}`;
  }
  if (DOM.dayusePayersCount) {
    DOM.dayusePayersCount.textContent = `${totalPayers} pagante${totalPayers !== 1 ? 's' : ''} (${state.dayUseData.adults} adulto${state.dayUseData.adults !== 1 ? 's' : ''} + ${payingChildren} criança${payingChildren !== 1 ? 's' : ''})`;
  }
}

/**
 * Gera o texto final da mensagem formatada para WhatsApp
 */
export function generateMessageText() {
  if (state.activeTab === 'dados') {
    return generateDayUseDataMessage();
  } else {
    return generateBudgetMessage();
  }
}

/**
 * Gera mensagem para as abas de Orçamento (Padrão ou Day Use com Chalé)
 */
function generateBudgetMessage() {
  const templateConfig = state.activeTab === 'dayuse_chale' 
    ? state.client.budgetTemplates.dayuse_chale 
    : state.client.budgetTemplates.padrao;

  const checkinDDMM = formatDateDDMM(state.budget.checkin);
  const checkoutDDMM = formatDateDDMM(state.budget.checkout);
  const totalGuests = state.budget.adults + state.budget.children;
  const totalGuestsStr = padZero(totalGuests);

  // Formatação dos valores dos chalés
  const formatChaleLine = (chaleId) => {
    if (state.budget.unavailable[chaleId]) {
      return 'Indisponível';
    }
    if (isFieldBlockedByChildren(chaleId)) {
      return 'Não permite crianças';
    }
    const val = state.budget.values[chaleId];
    if (!val && val !== 0) {
      return 'A consultar';
    }
    return `R$ ${formatMoney(val)}`;
  };

  const valorVistaLago = formatChaleLine('vista_lago');
  const valorHortensia = formatChaleLine('hortensia');
  const valorSemHidro = formatChaleLine('sem_hidro');

  return `${templateConfig.header}

${checkinDDMM} a ${checkoutDDMM} (${totalGuestsStr} pessoas)
➡️Entrada: ${templateConfig.checkinTime}
⬅️Saída: ${templateConfig.checkoutTime}

*CHALÉS COM HIDRO:*
*Vista do lago (hidro maior):* ${valorVistaLago}
*Hortênsia (hidro menor):* ${valorHortensia}

*CHALÉS SEM HIDRO:* ${valorSemHidro}`;
}

/**
 * Gera mensagem para a Aba 3: Day Use - Solicitação de Dados
 */
function generateDayUseDataMessage() {
  const dateDDMM = formatDateDDMM(state.dayUseData.date);
  const payingChildren = state.dayUseData.childrenList.filter(c => !c.isExempt).length;
  const totalPayers = state.dayUseData.adults + payingChildren;
  const totalPrice = totalPayers * state.dayUseData.pricePerPerson;
  const phoneText = state.dayUseData.phone ? state.dayUseData.phone.trim() : '';

  let blocks = [];
  let blockCounter = 1;

  // Bloco 01 - Titular
  blocks.push(`*${padZero(blockCounter)}*
NOME:
CPF:
NASCIMENTO:
EMAIL:`);
  blockCounter++;

  // Blocos seguintes de adultos
  for (let i = 2; i <= state.dayUseData.adults; i++) {
    blocks.push(`*${padZero(blockCounter)}*
NOME:
CPF:
NASCIMENTO:`);
    blockCounter++;
  }

  // Blocos de crianças
  state.dayUseData.childrenList.forEach((child) => {
    const statusText = child.isExempt ? 'Não pagante' : 'Pagante';
    const ageLabel = child.age !== undefined ? ` (${child.age} anos)` : '';
    blocks.push(`*${padZero(blockCounter)} - Criança${ageLabel}*
NOME:
CPF:
NASCIMENTO:
${statusText}`);
    blockCounter++;
  });

  const formattedBlocks = blocks.join('\n\n');

  return `*DADOS PARA DAY-USE*

DATA: ${dateDDMM}
VALOR: R$ ${formatMoney(totalPrice)}
VALOR PAGO: 
TEL: ${phoneText}

${formattedBlocks}`;
}

/**
 * Renderiza o preview em tempo real no painel lateral estilo WhatsApp
 */
function renderPreview() {
  const msg = generateMessageText();
  if (DOM.previewText) {
    DOM.previewText.textContent = msg;
  }
}

/**
 * Manipula a cópia da mensagem para a área de transferência
 */
async function handleCopyMessage() {
  const msg = generateMessageText();
  const success = await copyToClipboard(msg);
  
  if (success) {
    showToast('Mensagem copiada com sucesso para o WhatsApp!', 'success');
    DOM.copyBtn.classList.add('copied');
    DOM.copyBtn.innerHTML = `<span>✓</span> Copiado!`;
    setTimeout(() => {
      DOM.copyBtn.classList.remove('copied');
      DOM.copyBtn.innerHTML = `<span>📋</span> Copiar Mensagem`;
    }, 2000);
  } else {
    showToast('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.', 'error');
  }
}

/**
 * Exibe notificação Toast flutuante
 */
export function showToast(message, type = 'info') {
  if (!DOM.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span>${message}</span>
    </div>
  `;
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);
