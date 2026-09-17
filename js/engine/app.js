/**
 * StayMessage Engine — Core Application Controller
 * Modular, agnostic, white-label orchestration engine
 */

import { PROFILE_REGISTRY, DEFAULT_PROFILE_ID, getProfileById } from '../profiles/registry.js';
import { 
  formatMoney, 
  formatDateDDMM, 
  calculateNights, 
  padZero, 
  copyToClipboard, 
  formatLocalDateISO 
} from './utils.js';
import { DateRangePicker } from './calendar.js';
import { buildBudgetMessage, buildDayUseDataMessage } from './message-builder.js';

// Application Global State (Always initialized strictly with DEFAULT_PROFILE_ID)
const initialProfile = getProfileById(DEFAULT_PROFILE_ID);
const initialProfileId = DEFAULT_PROFILE_ID;

const state = {
  activeProfileId: initialProfileId,
  profile: initialProfile,
  activeTab: 'padrao', // 'padrao' | 'dayuse_chale' | 'dados'

  budget: {
    checkin: '',
    checkout: '',
    adults: 2,
    children: 0,
    values: {},
    unavailable: {},
    unlockedExceptions: {},
    manualEdits: {}
  },

  dayUseData: {
    date: '',
    pricePerPerson: Number(initialProfile.dayUse?.defaultPricePerPerson) || 0,
    adults: 2,
    children: 0,
    childrenList: [],
    phone: ''
  }
};

/**
 * Applies the profile theme tokens to :root CSS variables and updates brand icon
 * @param {Object} theme 
 */
function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;

  const primary = theme.colorPrimary || theme.primary;
  const primaryDark = theme.colorPrimaryDark || theme.primaryDark;
  const primaryLight = theme.colorPrimaryLight || theme.primaryLight;
  const primarySubtle = theme.colorPrimarySubtle || theme.primarySubtle;

  if (primary) root.style.setProperty('--color-primary', primary);
  if (primaryDark) root.style.setProperty('--color-primary-dark', primaryDark);
  if (primaryLight) root.style.setProperty('--color-primary-light', primaryLight);
  if (primarySubtle) root.style.setProperty('--color-primary-subtle', primarySubtle);

  // Update brand icon SVG if custom icon is provided
  if (theme.brandIconSvg) {
    const brandIconContainer = document.querySelector('.brand-icon');
    if (brandIconContainer) {
      brandIconContainer.innerHTML = theme.brandIconSvg;
    }
  }
}

// Initialize accommodation state collections dynamically from active profile
function initAccommodationState() {
  state.profile.accommodations.forEach(unit => {
    state.budget.values[unit.id] = '';
    state.budget.unavailable[unit.id] = false;
    state.budget.unlockedExceptions[unit.id] = false;
    state.budget.manualEdits[unit.id] = false;
  });
}

// DOM References Cache
let DOM = {};

function mapAccommodationDOM() {
  DOM.unitInputs = {};
  DOM.unitUnavailable = {};
  DOM.unitWarnings = {};
  DOM.unitWrappers = {};

  state.profile.accommodations.forEach(unit => {
    DOM.unitInputs[unit.id] = document.getElementById(`val-${unit.id}`);
    DOM.unitUnavailable[unit.id] = document.getElementById(`unavail-${unit.id}`);
    DOM.unitWarnings[unit.id] = document.getElementById(`warn-${unit.id}`);
    DOM.unitWrappers[unit.id] = document.getElementById(`wrapper-${unit.id}`);
  });
}

function initDOMReferences() {
  DOM = {
    // Header & Meta
    clientName: document.getElementById('client-name'),
    profileSwitcher: document.getElementById('profile-switcher-select'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content-panel'),

    // Budget Tab Inputs & Controls
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

    // Dynamic Accommodations Container & Unit Mappings
    accommodationsContainer: document.getElementById('accommodations-container'),
    unitInputs: {},
    unitUnavailable: {},
    unitWarnings: {},
    unitWrappers: {},

    // Tab 3: Day Use Controls
    dayuseDateContainer: document.getElementById('dayuse-date-container'),
    btnDayuseDate: document.getElementById('btn-dayuse-date'),
    dayuseDate: document.getElementById('dayuse-date'),
    dayusePriceOptionsContainer: document.getElementById('dayuse-price-options-container'),
    dayuseAdults: document.getElementById('dayuse-adults'),
    dayuseChildren: document.getElementById('dayuse-children'),
    dayuseChildrenContainer: document.getElementById('children-cards-container'),
    dayusePhone: document.getElementById('dayuse-phone'),
    dayuseTotalBadge: document.getElementById('dayuse-total-badge'),
    dayusePayersCount: document.getElementById('dayuse-payers-count'),

    // WhatsApp Live Preview & Copy Action
    previewText: document.getElementById('preview-message-text'),
    copyBtn: document.getElementById('btn-copy-message'),

    // Policy Unlock Exception Modal
    unlockModal: document.getElementById('unlock-modal'),
    unlockModalUnitName: document.getElementById('unlock-chale-name'),
    unlockModalConfirmBtn: document.getElementById('btn-modal-confirm-unlock'),
    unlockModalCancelBtn: document.getElementById('btn-modal-cancel-unlock'),

    // Floating Toasts
    toastContainer: document.getElementById('toast-container')
  };

  mapAccommodationDOM();
}

// DatePicker Instances
let budgetPicker = null;
let dayusePicker = null;
let currentUnlockTargetUnitId = null;

/**
 * Dynamically renders the accommodation units into the DOM
 */
function renderAccommodations() {
  const container = document.getElementById('accommodations-container');
  if (!container) return;

  container.innerHTML = '';

  state.profile.accommodations.forEach(unit => {
    const cardEl = document.createElement('div');
    cardEl.className = 'chale-item-card';
    cardEl.id = `wrapper-${unit.id}`;

    const currencyPrefix = state.profile.meta?.currencySymbol || 'R$';
    const badgeText = unit.badge?.text || '';
    const badgeClass = unit.badge?.cssClass || 'cat-no-hydro';

    cardEl.innerHTML = `
      <div class="chale-card-top">
        <div class="chale-header-info">
          <h4>
            ${unit.label}
            ${badgeText ? `<span class="chale-badge-cat ${badgeClass}">${badgeText}</span>` : ''}
          </h4>
          <p class="chale-subinfo">${unit.sublabel}</p>
        </div>
      </div>
      <div class="chale-controls-grid">
        <div class="price-input-wrapper">
          <span class="price-currency-prefix">${currencyPrefix}</span>
          <input type="text" id="val-${unit.id}" placeholder="0,00" class="form-control" />
        </div>
        <label class="checkbox-toggle-container" for="unavail-${unit.id}">
          <input type="checkbox" id="unavail-${unit.id}" />
          <span>Indisponível</span>
        </label>
      </div>
      <div class="chale-warning-msg" id="warn-${unit.id}"></div>
    `;

    container.appendChild(cardEl);
  });
}

/**
 * Safely extracts a numeric price from a primitive number or an option object
 * @param {number|Object|string} opt
 * @param {number} fallback
 * @returns {number}
 */
function extractPriceNumber(opt, fallback = 0) {
  if (opt === null || opt === undefined) return fallback;
  if (typeof opt === 'number') return isNaN(opt) ? fallback : opt;
  if (typeof opt === 'object') {
    const val = opt.value !== undefined ? opt.value : opt.price;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  }
  const num = Number(opt);
  return isNaN(num) ? fallback : num;
}

/**
 * Returns a human-friendly label for a Day Use price option
 * @param {number|Object|string} opt
 * @param {number} index
 * @param {string} currency
 * @returns {string}
 */
function getDayUseOptionLabel(opt, index, currency = 'R$') {
  if (typeof opt === 'object' && opt !== null && opt.label) {
    return opt.label;
  }
  const num = extractPriceNumber(opt);
  const formatted = `${currency} ${formatMoney(num)}`;
  if (index === 0) return `${formatted} (Seg a Qui)`;
  if (index === 1) return `${formatted} (Sex a Dom e Feriados)`;
  return formatted;
}

/**
 * Auto-selects Day Use price option based on day of the week (weekday vs weekend)
 * @param {string} dateStr - Date formatted as YYYY-MM-DD
 */
function handleDayUseDateChange(dateStr) {
  if (!dateStr) return;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return;

  // Build local date object without timezone offset shifts
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado

  // Segunda a quinta (1, 2, 3, 4) = índice 0 (valor padrão)
  // Sexta, sábado, domingo (5, 6, 0) = índice 1 (valor fim de semana/feriado)
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6);
  const targetIndex = isWeekend ? 1 : 0;

  const options = state.profile.dayUse?.priceOptions || [65, 80];
  const selectedOption = options[targetIndex] !== undefined ? options[targetIndex] : options[0];
  const defaultPrice = extractPriceNumber(state.profile.dayUse?.defaultPricePerPerson, 65);

  const numericPrice = extractPriceNumber(selectedOption, defaultPrice);
  state.dayUseData.pricePerPerson = numericPrice;

  // Atualiza simultaneamente o atributo .checked = true no DOM
  const targetRadio = document.getElementById(`dayuse-price-${numericPrice}`);
  if (targetRadio) {
    targetRadio.checked = true;
  } else {
    const fallbackRadio = document.querySelector(`input[name="dayuse_price_option"][value="${numericPrice}"]`);
    if (fallbackRadio) fallbackRadio.checked = true;
  }

  updateDayUseCalculations();
  renderPreview();
}

/**
 * Dynamically renders the Day Use radio price options from active profile
 */
function renderDayUsePriceOptions() {
  const container = document.getElementById('dayuse-price-options-container');
  if (!container) return;

  container.innerHTML = '';
  const priceOptions = state.profile.dayUse?.priceOptions || [65, 80];
  const defaultPrice = extractPriceNumber(state.profile.dayUse?.defaultPricePerPerson, extractPriceNumber(priceOptions[0], 65));
  const currency = state.profile.meta?.currencySymbol || 'R$';

  priceOptions.forEach((opt, index) => {
    const priceVal = extractPriceNumber(opt, defaultPrice);
    const labelText = getDayUseOptionLabel(opt, index, currency);
    const isChecked = state.dayUseData.pricePerPerson > 0 
      ? priceVal === state.dayUseData.pricePerPerson 
      : (priceVal === defaultPrice || index === 0);
    const radioId = `dayuse-price-${priceVal}`;

    const labelEl = document.createElement('label');
    labelEl.className = 'radio-price-card';
    labelEl.setAttribute('for', radioId);

    labelEl.innerHTML = `
      <input type="radio" name="dayuse_price_option" id="${radioId}" value="${Number(priceVal)}" ${isChecked ? 'checked' : ''} />
      <span>${labelText}</span>
    `;

    const radioInput = labelEl.querySelector('input');
    radioInput.addEventListener('change', (e) => {
      if (e.target.checked) {
        const parsed = parseFloat(e.target.value);
        state.dayUseData.pricePerPerson = !isNaN(parsed) && parsed > 0 ? parsed : defaultPrice;
        updateDayUseCalculations();
        renderPreview();
      }
    });

    container.appendChild(labelEl);
  });

  if (!state.dayUseData.pricePerPerson || isNaN(state.dayUseData.pricePerPerson)) {
    state.dayUseData.pricePerPerson = defaultPrice;
  }
}

/**
 * Populates and synchronizes the header profile switcher dropdown
 */
function populateProfileSwitcher() {
  const select = DOM.profileSwitcher || document.getElementById('profile-switcher-select');
  if (!select) return;

  select.innerHTML = '';
  Object.entries(PROFILE_REGISTRY).forEach(([key, profile]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = profile.meta?.name || profile.name || key;
    if (key === state.activeProfileId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  select.value = state.activeProfileId;

  select.onchange = (e) => {
    const selectedId = e.target.value;
    switchProfile(selectedId);
  };
}

/**
 * Switches the active profile at runtime with full lifecycle reconciliation & absolute reset
 * @param {string} profileId
 */
export async function switchProfile(profileId) {
  if (!profileId || profileId === 'undefined') {
    return;
  }

  if (state.activeProfileId === profileId && state.profile) {
    return;
  }

  try {
    const targetProfile = getProfileById(profileId);
    if (!targetProfile) {
      throw new Error(`Profile with ID "${profileId}" not found in registry.`);
    }

    // 1. Subtle fade-out transition on accommodations list (~150ms)
    const container = DOM.accommodationsContainer || document.getElementById('accommodations-container');
    if (container) {
      container.classList.add('is-switching');
    }

    // Brief visual pause
    await new Promise(resolve => setTimeout(resolve, 150));

    // 2. Update state BEFORE re-rendering (pure in-memory, no persistence)
    state.activeProfileId = profileId;
    state.profile = targetProfile;

    // 3. Inject dynamic CSS theme tokens
    applyTheme(state.profile.meta?.theme);

    // 4. Update Header brand and dropdown
    if (DOM.clientName && state.profile.meta?.name) {
      DOM.clientName.textContent = state.profile.meta.name;
    }
    if (DOM.profileSwitcher) {
      DOM.profileSwitcher.value = profileId;
    }

    // 5. Absolute Reset: Dates to standard (Check-in Today, Check-out Tomorrow, Day Use Today)
    setupInitialDates();

    // 6. Absolute Reset: Guest counters back to 2 Adults, 0 Children
    state.budget.adults = 2;
    state.budget.children = 0;
    if (DOM.budgetAdults) DOM.budgetAdults.value = 2;
    if (DOM.budgetChildren) DOM.budgetChildren.value = 0;

    state.dayUseData.adults = 2;
    state.dayUseData.children = 0;
    state.dayUseData.phone = '';
    state.dayUseData.childrenList = [];
    if (DOM.dayuseAdults) DOM.dayuseAdults.value = 2;
    if (DOM.dayuseChildren) DOM.dayuseChildren.value = 0;
    if (DOM.dayusePhone) DOM.dayusePhone.value = '';
    updateDayUseChildrenList();

    // 7. Absolute Reset: Accommodations (flush values, uncheck unavail, revoke unlock exceptions)
    state.budget.values = {};
    state.budget.unavailable = {};
    state.budget.unlockedExceptions = {};
    state.budget.manualEdits = {};
    initAccommodationState();

    // 8. Re-render accommodations (clean inputs, no datalist, empty for manual input)
    renderAccommodations();
    mapAccommodationDOM();
    setupAccommodationEventListeners();

    // 9. Absolute Reset: Day Use (select base rate, reset pricing for Today)
    state.dayUseData.pricePerPerson = Number(state.profile.dayUse?.defaultPricePerPerson) || 0;
    renderDayUsePriceOptions();
    handleDayUseDateChange(state.dayUseData.date);

    // 10. Recalculate calculations (pure summary badges, no auto-fill)
    updateBudgetCalculations();
    recalculateDayUseExemptions();
    updateDayUseCalculations();

    // 11. Re-render live preview (rooms display "A consultar" until manually filled)
    renderPreview();

    // 12. Fade-in accommodations list
    if (container) {
      container.classList.remove('is-switching');
    }

    // 13. Toast notification
    showToast(`Perfil alterado para ${state.profile.meta.name}`, 'info');
  } catch (error) {
    console.error('[StayMessage] Error in switchProfile:', error);
    const container = DOM.accommodationsContainer || document.getElementById('accommodations-container');
    if (container) {
      container.classList.remove('is-switching');
    }
    showToast('Erro ao alternar perfil. Consulte o console.', 'error');
  }
}

/**
 * Initializes the entire application engine
 */
export function initApp() {
  applyTheme(state.profile.meta?.theme);
  initAccommodationState();
  renderAccommodations();
  initDOMReferences();
  populateProfileSwitcher();
  renderDayUsePriceOptions();

  // Hydrate establishment brand name
  if (DOM.clientName && state.profile.meta?.name) {
    DOM.clientName.textContent = state.profile.meta.name;
  }

  setupInitialDates();
  setupDatePickers();
  setupDatalist();
  setupEventListeners();
  updateBudgetCalculations();
  updateDayUseChildrenList();
  renderPreview();
}

/**
 * Configures the custom DateRangePicker instances
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
      allowSameDay: true,
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
      singleMode: true,
      allowSameDay: true,
      onSelect: (date) => {
        state.dayUseData.date = date;
        handleDayUseDateChange(date);
      }
    });
    dayusePicker.setDates(state.dayUseData.date);
  }
}

/**
 * Sets initial dates (Today & Tomorrow for budget, Today for Day Use)
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

  handleDayUseDateChange(state.dayUseData.date);
}

/**
 * Populates datalist with profile pricing suggestions
 */
function setupDatalist() {
  const datalist = document.getElementById('datalist-valores');
  if (!datalist) return;
  datalist.innerHTML = '';
  
  const suggestions = state.profile.pricing.datalistSuggestions || [];
  suggestions.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.label = `${state.profile.meta.currencySymbol || 'R$'} ${formatMoney(val)}`;
    datalist.appendChild(opt);
  });
}

/**
 * Checks if an accommodation unit is blocked by child restriction policies
 * @param {string} unitId
 * @returns {boolean}
 */
function isFieldBlockedByPolicy(unitId) {
  const policy = state.profile.policies.childRestrictions;
  if (!policy || !policy.enabled) return false;

  const unit = state.profile.accommodations.find(u => u.id === unitId);
  if (!unit) return false;

  const hasRestrictedTag = (unit.tags || []).some(tag => policy.restrictedTags.includes(tag));
  return hasRestrictedTag && state.budget.children > 0 && !state.budget.unlockedExceptions[unitId];
}

/**
 * Binds event listeners to dynamic accommodation inputs and toggles
 */
function setupAccommodationEventListeners() {
  state.profile.accommodations.forEach(unit => {
    const inputEl = DOM.unitInputs[unit.id];
    const unavailEl = DOM.unitUnavailable[unit.id];

    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        state.budget.values[unit.id] = e.target.value;
        state.budget.manualEdits[unit.id] = true;
        renderPreview();
      });

      // Click on policy-locked field opens exception confirmation modal
      inputEl.addEventListener('click', () => {
        if (isFieldBlockedByPolicy(unit.id)) {
          openUnlockModal(unit.id);
        }
      });
    }

    if (unavailEl) {
      unavailEl.addEventListener('change', (e) => {
        state.budget.unavailable[unit.id] = e.target.checked;
        if (inputEl) {
          inputEl.disabled = e.target.checked || isFieldBlockedByPolicy(unit.id);
        }
        renderPreview();
      });
    }
  });
}

/**
 * Binds all interactive event listeners
 */
function setupEventListeners() {
  // Navigation Tabs
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;
      setActiveTab(tabTarget);
    });
  });

  // Budget Type Select Dropdown (Sync with Tabs 1 & 2)
  if (DOM.budgetTypeSelect) {
    DOM.budgetTypeSelect.addEventListener('change', (e) => {
      setActiveTab(e.target.value);
    });
  }

  // Budget Inputs
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
      state.budget.children = Math.max(0, parseInt(e.target.value) || 0);
      
      // If children count drops to 0, reset manual policy unlock exceptions
      if (state.budget.children === 0) {
        state.profile.accommodations.forEach(u => {
          state.budget.unlockedExceptions[u.id] = false;
        });
      }
      
      updateBudgetCalculations(false);
      renderPreview();
    });
  }

  // Dynamic Accommodation Unit Listeners
  setupAccommodationEventListeners();

  // Policy Exception Modal Actions
  DOM.unlockModalConfirmBtn.addEventListener('click', () => {
    if (currentUnlockTargetUnitId) {
      state.budget.unlockedExceptions[currentUnlockTargetUnitId] = true;
      const unit = state.profile.accommodations.find(u => u.id === currentUnlockTargetUnitId);
      showToast(`Edição liberada para ${unit ? unit.label : currentUnlockTargetUnitId} (Exceção)`, 'warning');
      DOM.unlockModal.classList.remove('active');
      updateBudgetCalculations(false);
      if (DOM.unitInputs[currentUnlockTargetUnitId]) {
        DOM.unitInputs[currentUnlockTargetUnitId].focus();
      }
      renderPreview();
    }
  });

  DOM.unlockModalCancelBtn.addEventListener('click', () => {
    DOM.unlockModal.classList.remove('active');
    currentUnlockTargetUnitId = null;
  });

  // Tab 3: Day Use Controls
  if (DOM.dayuseDate) {
    DOM.dayuseDate.addEventListener('change', (e) => {
      state.dayUseData.date = e.target.value;
      handleDayUseDateChange(e.target.value);
    });
  }

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

  // Copy Message Button
  if (DOM.copyBtn) {
    DOM.copyBtn.addEventListener('click', handleCopyMessage);
  }
}

/**
 * Opens the exception modal for locked accommodation units
 * @param {string} unitId 
 */
function openUnlockModal(unitId) {
  currentUnlockTargetUnitId = unitId;
  const unit = state.profile.accommodations.find(u => u.id === unitId);
  if (DOM.unlockModalUnitName) {
    DOM.unlockModalUnitName.textContent = unit ? unit.label : unitId;
  }
  DOM.unlockModal.classList.add('active');
}

/**
 * Switches the active tab panel
 * @param {string} tabId 
 */
export function setActiveTab(tabId) {
  state.activeTab = tabId;

  // Close any open date pickers
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
 * Updates budget summary badges, capacity warnings, and manages policy locks
 * Note: Diária prices operate strictly in manual entry mode (no auto-fill).
 */
function updateBudgetCalculations() {
  const totalGuests = state.budget.adults + state.budget.children;
  const nights = calculateNights(state.budget.checkin, state.budget.checkout);

  // Update summary badge text
  if (DOM.budgetNightsBadge) {
    DOM.budgetNightsBadge.textContent = `${nights} ${nights === 1 ? 'diária' : 'diárias'}`;
  }
  if (DOM.budgetTotalGuestsBadge) {
    DOM.budgetTotalGuestsBadge.textContent = `${padZero(totalGuests)} ${totalGuests === 1 ? 'hóspede' : 'hóspedes'}`;
  }

  state.profile.accommodations.forEach(unit => {
    const inputEl = DOM.unitInputs[unit.id];
    const wrapperEl = DOM.unitWrappers[unit.id];
    const warnEl = DOM.unitWarnings[unit.id];
    if (!inputEl || !wrapperEl || !warnEl) return;

    const blockedByPolicy = isFieldBlockedByPolicy(unit.id);
    const blockedMsg = state.profile.policies.childRestrictions?.blockedMessage || 'Não permite crianças';

    // Policy lock management
    if (blockedByPolicy) {
      inputEl.value = blockedMsg;
      inputEl.classList.add('blocked-by-policy');
      inputEl.setAttribute('readonly', 'true');
      wrapperEl.classList.add('is-locked');
    } else {
      inputEl.classList.remove('blocked-by-policy');
      inputEl.removeAttribute('readonly');
      wrapperEl.classList.remove('is-locked');

      // If field was previously holding the blocked message and is now unlocked, restore manual value or empty
      if (inputEl.value === blockedMsg) {
        inputEl.value = state.budget.values[unit.id] || '';
      }
    }

    // Availability toggle state
    if (state.budget.unavailable[unit.id]) {
      inputEl.disabled = true;
      wrapperEl.classList.add('is-unavailable');
    } else {
      inputEl.disabled = false;
      wrapperEl.classList.remove('is-unavailable');
    }

    // Capacity limit warning alert
    if (totalGuests > unit.maxCapacity) {
      warnEl.innerHTML = `
        <span class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <span>Capacidade máx. recomendada: ${unit.maxCapacity} pessoas (Total atual: ${totalGuests})</span>
      `;
      warnEl.classList.add('show');
    } else {
      warnEl.innerHTML = '';
      warnEl.classList.remove('show');
    }
  });
}

/**
 * Updates dynamic children list for Tab 3 (Day Use)
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

  recalculateDayUseExemptions();
  renderDayUseChildrenUI();
}

/**
 * Recalculates child exemptions based on age rules and maximum allowed count
 */
function recalculateDayUseExemptions() {
  const exemptionRules = state.profile.dayUse.exemptionRules || { maxExemptChildren: 2, maxExemptAge: 7 };
  const maxExempt = exemptionRules.maxExemptChildren;
  const maxExemptAge = exemptionRules.maxExemptAge;
  let exemptCount = 0;

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
 * Renders child cards in Tab 3 form
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
          ${child.isExempt ? 'Isenta (Não pagante)' : 'Pagante'}
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

    const ageInput = card.querySelector(`#child-age-${child.id}`);
    const statusSelect = card.querySelector(`#child-status-${child.id}`);

    ageInput.addEventListener('input', (e) => {
      child.age = Math.max(0, parseInt(e.target.value) || 0);
      child.manualOverride = false;
      recalculateDayUseExemptions();
      renderDayUseChildrenUI();
      updateDayUseCalculations();
      renderPreview();
    });

    statusSelect.addEventListener('change', (e) => {
      child.isExempt = e.target.value === 'exempt';
      child.manualOverride = true;
      renderDayUseChildrenUI();
      updateDayUseCalculations();
      renderPreview();
    });

    DOM.dayuseChildrenContainer.appendChild(card);
  });
}

/**
 * Updates total Day Use calculation banner with safe coercion
 */
function updateDayUseCalculations() {
  const adults = parseInt(state.dayUseData.adults, 10) || 0;
  const price = parseFloat(state.dayUseData.pricePerPerson) || 0;
  const payingChildren = (state.dayUseData.childrenList || []).filter(c => !c.isExempt).length || 0;
  const totalPayers = Math.max(0, adults + payingChildren);
  const rawTotal = totalPayers * price;
  const totalPrice = (!isNaN(rawTotal) && rawTotal >= 0) ? rawTotal : 0;

  if (DOM.dayuseTotalBadge) {
    const displayTotal = !isNaN(totalPrice) ? totalPrice : 0;
    DOM.dayuseTotalBadge.textContent = `${state.profile.meta?.currencySymbol || 'R$'} ${formatMoney(displayTotal)}`;
  }

  if (DOM.dayusePayersCount) {
    DOM.dayusePayersCount.textContent = `${totalPayers} pagante${totalPayers !== 1 ? 's' : ''} (${adults} adulto${adults !== 1 ? 's' : ''} + ${payingChildren} criança${payingChildren !== 1 ? 's' : ''})`;
  }
}

/**
 * Generates formatted message text for WhatsApp preview
 * @returns {string}
 */
export function generateMessageText() {
  if (state.activeTab === 'dados') {
    return buildDayUseDataMessage(state, state.profile);
  } else {
    return buildBudgetMessage(state, state.profile, isFieldBlockedByPolicy);
  }
}

/**
 * Renders live preview in the WhatsApp preview panel
 */
function renderPreview() {
  const msg = generateMessageText();
  if (DOM.previewText) {
    DOM.previewText.textContent = msg;
  }
}

/**
 * Handles copying quotation to clipboard with button feedback
 */
async function handleCopyMessage() {
  const msg = generateMessageText();
  const success = await copyToClipboard(msg);
  
  if (success) {
    showToast('Mensagem copiada com sucesso para o WhatsApp!', 'success');
    DOM.copyBtn.classList.add('copied');
    DOM.copyBtn.innerHTML = `
      <span class="icon">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
      <span>Copiado!</span>
    `;
    setTimeout(() => {
      DOM.copyBtn.classList.remove('copied');
      DOM.copyBtn.innerHTML = `
        <span class="icon" id="btn-copy-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </span>
        <span id="btn-copy-text">Copiar Mensagem</span>
      `;
    }, 2000);
  } else {
    showToast('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.', 'error');
  }
}

/**
 * Displays floating toast notification
 * @param {string} message 
 * @param {string} type 
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

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
