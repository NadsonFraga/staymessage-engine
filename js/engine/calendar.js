/**
 * StayMessage Engine — DateRangePicker Module
 *
 * Desktop-optimized calendar component:
 * - Dual-month side-by-side view (Airbnb-style)
 * - Range selection with real-time hover preview
 * - Single date mode for Day Use tab (dual month visible for visual consistency)
 * - Outside-click rollback if range is incomplete (no half-selected states)
 * - Accessible keyboard triggers (Enter/Space to open, Tab solely focuses without opening)
 * - Localized date formatting: DD/MM (DayOfWeek)
 * - Min-date enforcement preventing past date selection
 */

export class DateRangePicker {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - The wrapper container where the picker is anchored
   * @param {HTMLElement} [options.checkinBtn] - Trigger button for check-in
   * @param {HTMLElement} [options.checkoutBtn] - Trigger button for check-out
   * @param {HTMLElement} [options.singleBtn] - Trigger button for single date mode
   * @param {HTMLInputElement} [options.checkinInput] - Hidden input for check-in (ISO YYYY-MM-DD)
   * @param {HTMLInputElement} [options.checkoutInput] - Hidden input for check-out (ISO YYYY-MM-DD)
   * @param {HTMLInputElement} [options.singleInput] - Hidden input for single date (ISO YYYY-MM-DD)
   * @param {boolean} [options.singleMode=false] - True for single date picker (Day Use)
   * @param {boolean} [options.allowSameDay=true] - Allow check-in and check-out on the same day
   * @param {string|Date} [options.minDate] - Minimum selectable date (defaults to today 00:00:00)
   * @param {Function} [options.onSelect] - Callback triggered on selection commit
   */
  constructor(options) {
    this.container = options.container;
    this.checkinBtn = options.checkinBtn;
    this.checkoutBtn = options.checkoutBtn;
    this.singleBtn = options.singleBtn;
    this.checkinInput = options.checkinInput;
    this.checkoutInput = options.checkoutInput;
    this.singleInput = options.singleInput;
    this.singleMode = Boolean(options.singleMode);
    this.allowSameDay = options.allowSameDay !== false;
    this.onSelect = options.onSelect || (() => {});

    // Minimum date: default to today (midnight local time)
    if (options.minDate) {
      this.minDate = this.normalizeDate(options.minDate);
    } else {
      const now = new Date();
      this.minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Committed selection state (ISO strings YYYY-MM-DD)
    this.committedStartDate = null;
    this.committedEndDate = null;

    // Ephemeral selection state during user interaction
    this.selectingStartDate = null;
    this.selectingEndDate = null;
    this.hoverDate = null;
    this.selectionStep = 0; // 0 = picking start, 1 = picking end

    // Current calendar view (year and month for the left month)
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();

    this.isOpen = false;
    this.panelEl = null;

    // Bound listeners for clean cleanup
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.init();
  }

  /**
   * Initializes triggers and creates floating calendar panel
   */
  init() {
    this.createPanel();
    this.bindTriggerEvents();
  }

  /**
   * Normalizes string or Date to clean Date at 00:00:00 local time
   * @param {string|Date} dateInput
   * @returns {Date|null}
   */
  normalizeDate(dateInput) {
    if (!dateInput) return null;
    if (typeof dateInput === 'string') {
      const [y, m, d] = dateInput.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
  }

  /**
   * Converts a Date to ISO string YYYY-MM-DD in local time
   * @param {Date} date
   * @returns {string}
   */
  formatISODate(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Formats a date for trigger button display: "20/09 (Sáb)"
   * @param {Date|string} dateInput
   * @returns {string}
   */
  formatDisplayDate(dateInput) {
    const d = this.normalizeDate(dateInput);
    if (!d) return '--/-- (---)';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekDay = weekDays[d.getDay()];

    return `${day}/${month} (${weekDay})`;
  }

  /**
   * Creates DOM elements for floating calendar panel
   */
  createPanel() {
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'calendar-dropdown-panel';
    this.panelEl.setAttribute('role', 'dialog');
    this.panelEl.setAttribute('aria-modal', 'true');
    this.panelEl.setAttribute('aria-label', this.singleMode ? 'Selecione a data' : 'Selecione o período');
    this.panelEl.style.display = 'none';

    // Base panel skeleton
    this.panelEl.innerHTML = `
      <div class="calendar-header-toolbar">
        <button type="button" class="calendar-nav-btn calendar-nav-prev" aria-label="Mês anterior">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="calendar-panel-title-badge">
          <span class="calendar-panel-title-text">${this.singleMode ? 'Selecione a data do Day Use' : 'Selecione as datas de check-in e check-out'}</span>
        </div>
        <button type="button" class="calendar-nav-btn calendar-nav-next" aria-label="Próximo mês">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      <div class="calendar-months-grid"></div>
      <div class="calendar-footer-bar">
        <div class="calendar-status-info">
          <span class="calendar-status-dot"></span>
          <span class="calendar-status-text"></span>
        </div>
        <div class="calendar-footer-actions">
          <button type="button" class="calendar-btn-cancel">Fechar</button>
        </div>
      </div>
    `;

    // Append to container
    this.container.appendChild(this.panelEl);

    // Nav listeners
    this.panelEl.querySelector('.calendar-nav-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      this.prevMonth();
    });

    this.panelEl.querySelector('.calendar-nav-next').addEventListener('click', (e) => {
      e.stopPropagation();
      this.nextMonth();
    });

    this.panelEl.querySelector('.calendar-btn-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(true); // Cancel reverts uncommitted state
    });

    // Stop click events inside calendar panel from propagating to document
    this.panelEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Binds click & keyboard triggers to trigger buttons
   * Note: Focus via TAB does NOT open the picker (Question 1 - Option B).
   * It only opens when clicking or pressing Enter/Space.
   */
  bindTriggerEvents() {
    const attachTrigger = (btn, targetStep = 0) => {
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isOpen) {
          this.close(true);
        } else {
          this.open(targetStep);
        }
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (!this.isOpen) {
            this.open(targetStep);
          } else {
            this.close(true);
          }
        }
      });
    };

    if (this.singleMode) {
      attachTrigger(this.singleBtn, 0);
    } else {
      attachTrigger(this.checkinBtn, 0);
      attachTrigger(this.checkoutBtn, 1);
    }
  }

  /**
   * Opens the calendar panel
   * @param {number} targetStep 0 for checkin focus, 1 for checkout focus
   */
  open(targetStep = 0) {
    if (this.isOpen) return;
    this.isOpen = true;

    // Reset interaction state to current committed state
    this.selectingStartDate = this.committedStartDate;
    this.selectingEndDate = this.committedEndDate;
    this.hoverDate = null;
    this.selectionStep = targetStep;

    // If starting from check-out button but no valid check-in exists, default to check-in
    if (!this.singleMode && targetStep === 1 && !this.selectingStartDate) {
      this.selectionStep = 0;
    }

    // Set view month based on start date or current date
    const baseDate = this.selectingStartDate ? this.normalizeDate(this.selectingStartDate) : new Date();
    this.viewYear = baseDate.getFullYear();
    this.viewMonth = baseDate.getMonth();

    this.render();
    this.panelEl.style.display = 'block';
    
    // Add active animation class
    requestAnimationFrame(() => {
      this.panelEl.classList.add('is-open');
    });

    if (this.checkinBtn) this.checkinBtn.classList.toggle('is-active', targetStep === 0);
    if (this.checkoutBtn) this.checkoutBtn.classList.toggle('is-active', targetStep === 1);
    if (this.singleBtn) this.singleBtn.classList.add('is-active');

    // Register global listeners
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Closes the calendar panel
   * @param {boolean} rollbackIfIncomplete - If true and user was midway through selecting, reverts to committed state
   */
  close(rollbackIfIncomplete = false) {
    if (!this.isOpen) return;

    if (rollbackIfIncomplete) {
      // Revert ephemeral selection to committed state (Question 4 - Option B)
      this.selectingStartDate = this.committedStartDate;
      this.selectingEndDate = this.committedEndDate;
      this.hoverDate = null;
      this.selectionStep = 0;
    }

    this.isOpen = false;
    this.panelEl.classList.remove('is-open');
    
    setTimeout(() => {
      if (!this.isOpen) {
        this.panelEl.style.display = 'none';
      }
    }, 200);

    if (this.checkinBtn) this.checkinBtn.classList.remove('is-active');
    if (this.checkoutBtn) this.checkoutBtn.classList.remove('is-active');
    if (this.singleBtn) this.singleBtn.classList.remove('is-active');

    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Global click handler (clicks outside panel close and rollback)
   */
  handleDocumentClick(e) {
    if (!this.isOpen) return;
    if (this.container.contains(e.target)) return;
    // Click outside: revert uncommitted selection and close
    this.close(true);
  }

  /**
   * Keyboard shortcuts while calendar is open
   */
  handleKeyDown(e) {
    if (!this.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close(true);
    }
  }

  /**
   * Advances calendar view to next month
   */
  nextMonth() {
    this.viewMonth++;
    if (this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear++;
    }
    this.render();
  }

  /**
   * Steps calendar view to previous month (if not before minDate month)
   */
  prevMonth() {
    if (this.isPrevMonthDisabled()) return;

    this.viewMonth--;
    if (this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear--;
    }
    this.render();
  }

  /**
   * Checks if previous month navigation should be disabled
   */
  isPrevMonthDisabled() {
    if (!this.minDate) return false;
    const currentViewFirstDay = new Date(this.viewYear, this.viewMonth, 1);
    const minMonthFirstDay = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);
    return currentViewFirstDay <= minMonthFirstDay;
  }

  /**
   * Sets initial or programmatically updated date values
   */
  setDates(start, end) {
    if (this.singleMode) {
      this.committedStartDate = start || null;
      this.committedEndDate = null;
      this.updateTriggerLabels();
      if (this.singleInput) this.singleInput.value = this.committedStartDate || '';
    } else {
      this.committedStartDate = start || null;
      this.committedEndDate = end || null;
      this.updateTriggerLabels();
      if (this.checkinInput) this.checkinInput.value = this.committedStartDate || '';
      if (this.checkoutInput) this.checkoutInput.value = this.committedEndDate || '';
    }
  }

  /**
   * Updates trigger button texts with friendly format: "20/09 (Sáb)"
   */
  updateTriggerLabels() {
    if (this.singleMode) {
      if (this.singleBtn) {
        const textEl = this.singleBtn.querySelector('.date-text');
        if (textEl) {
          textEl.textContent = this.committedStartDate ? this.formatDisplayDate(this.committedStartDate) : 'Selecione a data';
        }
      }
    } else {
      if (this.checkinBtn) {
        const textEl = this.checkinBtn.querySelector('.date-text');
        if (textEl) {
          textEl.textContent = this.committedStartDate ? this.formatDisplayDate(this.committedStartDate) : 'Selecione check-in';
        }
      }
      if (this.checkoutBtn) {
        const textEl = this.checkoutBtn.querySelector('.date-text');
        if (textEl) {
          textEl.textContent = this.committedEndDate ? this.formatDisplayDate(this.committedEndDate) : 'Selecione check-out';
        }
      }
    }
  }

  /**
   * Renders both months into the grid container
   */
  render() {
    const gridContainer = this.panelEl.querySelector('.calendar-months-grid');
    gridContainer.innerHTML = '';

    // Prev button disabled state
    const prevBtn = this.panelEl.querySelector('.calendar-nav-prev');
    if (prevBtn) {
      prevBtn.disabled = this.isPrevMonthDisabled();
      prevBtn.classList.toggle('is-disabled', this.isPrevMonthDisabled());
    }

    // Month 1 (Left)
    const m1 = this.renderMonthTable(this.viewYear, this.viewMonth);
    gridContainer.appendChild(m1);

    // Month 2 (Right)
    let nextMonth = this.viewMonth + 1;
    let nextYear = this.viewYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    const m2 = this.renderMonthTable(nextYear, nextMonth);
    gridContainer.appendChild(m2);

    this.updateStatusBar();
  }

  /**
   * Renders a single month table
   * @param {number} year
   * @param {number} month (0-11)
   * @returns {HTMLElement}
   */
  renderMonthTable(year, month) {
    const monthCard = document.createElement('div');
    monthCard.className = 'calendar-month-card';

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Month Title Header
    const header = document.createElement('div');
    header.className = 'calendar-month-header';
    header.innerHTML = `<span class="calendar-month-name">${monthNames[month]}</span> <span class="calendar-month-year">${year}</span>`;
    monthCard.appendChild(header);

    // Weekdays row
    const weekDaysRow = document.createElement('div');
    weekDaysRow.className = 'calendar-weekdays-row';
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    weekDays.forEach((wd, i) => {
      const col = document.createElement('div');
      col.className = 'calendar-weekday-col';
      if (i === 0 || i === 6) col.classList.add('is-weekend');
      col.textContent = wd;
      weekDaysRow.appendChild(col);
    });
    monthCard.appendChild(weekDaysRow);

    // Days grid
    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-days-grid';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Leading empty/placeholder cells for weekday offset
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day-cell is-empty';
      daysGrid.appendChild(emptyCell);
    }

    // Days of the month
    const today = new Date();
    const todayISO = this.formatISODate(today);

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, month, d);
      const isoDate = this.formatISODate(currentDate);

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'calendar-day-cell';
      cell.dataset.date = isoDate;

      // Day number inner span
      const numSpan = document.createElement('span');
      numSpan.className = 'calendar-day-number';
      numSpan.textContent = d;
      cell.appendChild(numSpan);

      // Check if disabled (past date)
      if (this.minDate && currentDate < this.minDate) {
        cell.classList.add('is-disabled');
        cell.disabled = true;
        cell.setAttribute('aria-disabled', 'true');
      } else {
        // Today badge indicator
        if (isoDate === todayISO) {
          cell.classList.add('is-today');
        }

        // Apply visual state (selected, range, hover)
        this.applyCellRangeClasses(cell, isoDate);

        // Cell interactions
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDateClick(isoDate);
        });

        if (!this.singleMode) {
          cell.addEventListener('mouseenter', () => {
            this.handleDateHover(isoDate);
          });
        }
      }

      daysGrid.appendChild(cell);
    }

    monthCard.appendChild(daysGrid);

    // Mouse leave on month table clears hover preview
    if (!this.singleMode) {
      daysGrid.addEventListener('mouseleave', () => {
        this.hoverDate = null;
        this.reapplyAllCellClasses();
        this.updateStatusBar();
      });
    }

    return monthCard;
  }

  /**
   * Applies CSS classes for start, end, range, and hover states
   * @param {HTMLElement} cell
   * @param {string} isoDate
   */
  applyCellRangeClasses(cell, isoDate) {
    cell.classList.remove(
      'is-start',
      'is-end',
      'is-single-day',
      'in-range',
      'in-hover-range',
      'is-hover-end'
    );

    if (this.singleMode) {
      if (isoDate === this.selectingStartDate) {
        cell.classList.add('is-start', 'is-single-day');
      }
      return;
    }

    const start = this.selectingStartDate;
    const end = this.selectingEndDate;
    const hover = this.hoverDate;

    // Both start and end selected
    if (start && end) {
      if (start === end && isoDate === start) {
        cell.classList.add('is-start', 'is-end', 'is-single-day');
      } else if (isoDate === start) {
        cell.classList.add('is-start');
      } else if (isoDate === end) {
        cell.classList.add('is-end');
      } else if (isoDate > start && isoDate < end) {
        cell.classList.add('in-range');
      }
    }
    // Start selected, picking end with hover preview
    else if (start && !end) {
      if (isoDate === start) {
        cell.classList.add('is-start');
        if (hover === start) {
          cell.classList.add('is-single-day');
        }
      } else if (hover && hover >= start) {
        if (isoDate === hover) {
          cell.classList.add('is-hover-end');
        } else if (isoDate > start && isoDate < hover) {
          cell.classList.add('in-hover-range');
        }
      }
    }
  }

  /**
   * Reapplies range classes to all day cells in the rendered calendar
   */
  reapplyAllCellClasses() {
    const cells = this.panelEl.querySelectorAll('.calendar-day-cell:not(.is-disabled):not(.is-empty)');
    cells.forEach(cell => {
      this.applyCellRangeClasses(cell, cell.dataset.date);
    });
  }

  /**
   * Handles click on a calendar date
   * @param {string} isoDate
   */
  handleDateClick(isoDate) {
    if (this.singleMode) {
      // Single date mode (Aba 3 Day Use): 1 click selects and immediately closes
      this.commitSelection(isoDate, null);
      return;
    }

    // Range Mode (Orçamento & Day Use com chalé)
    if (this.selectionStep === 0 || !this.selectingStartDate) {
      // Pick check-in
      this.selectingStartDate = isoDate;
      this.selectingEndDate = null;
      this.selectionStep = 1;

      if (this.checkinBtn) this.checkinBtn.classList.remove('is-active');
      if (this.checkoutBtn) this.checkoutBtn.classList.add('is-active');

      this.reapplyAllCellClasses();
      this.updateStatusBar();
    } else {
      // Pick check-out
      if (isoDate < this.selectingStartDate) {
        // Clicked before current checkin: restart range with new check-in
        this.selectingStartDate = isoDate;
        this.selectingEndDate = null;
        this.selectionStep = 1;
        this.reapplyAllCellClasses();
        this.updateStatusBar();
      } else if (isoDate === this.selectingStartDate && !this.allowSameDay) {
        // Same day not allowed scenario (handled gracefully)
        return;
      } else {
        // Valid end date (>= start date, including same day for Day Use)
        this.selectingEndDate = isoDate;
        this.commitSelection(this.selectingStartDate, this.selectingEndDate);
      }
    }
  }

  /**
   * Handles mouse hover on calendar days for dynamic preview
   * @param {string} isoDate
   */
  handleDateHover(isoDate) {
    if (this.singleMode) return;
    if (this.selectionStep !== 1 || !this.selectingStartDate) return;

    this.hoverDate = isoDate;
    this.reapplyAllCellClasses();
    this.updateStatusBar();
  }

  /**
   * Calculates night count between two ISO date strings
   * @param {string} startISO
   * @param {string} endISO
   * @returns {number}
   */
  calculateNights(startISO, endISO) {
    if (!startISO || !endISO) return 0;
    const d1 = this.normalizeDate(startISO);
    const d2 = this.normalizeDate(endISO);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Updates bottom status text & helper badge
   */
  updateStatusBar() {
    const statusTextEl = this.panelEl.querySelector('.calendar-status-text');
    if (!statusTextEl) return;

    if (this.singleMode) {
      if (this.committedStartDate) {
        statusTextEl.textContent = `Data selecionada: ${this.formatDisplayDate(this.committedStartDate)}`;
      } else {
        statusTextEl.textContent = 'Clique para escolher a data da reserva';
      }
      return;
    }

    const start = this.selectingStartDate;
    const end = this.selectingEndDate;
    const hover = this.hoverDate;

    if (!start) {
      statusTextEl.textContent = '1. Selecione a data de Check-in';
    } else if (start && !end) {
      if (hover) {
        if (hover === start) {
          statusTextEl.textContent = 'Mesmo dia (0 diárias / Day Use)';
        } else if (hover > start) {
          const nights = this.calculateNights(start, hover);
          statusTextEl.textContent = `${nights} ${nights === 1 ? 'diária' : 'diárias'} (${this.formatDisplayDate(start)} ➔ ${this.formatDisplayDate(hover)})`;
        } else {
          statusTextEl.textContent = `Definir novo Check-in: ${this.formatDisplayDate(hover)}`;
        }
      } else {
        statusTextEl.textContent = `2. Selecione a data de Check-out (Check-in: ${this.formatDisplayDate(start)})`;
      }
    } else if (start && end) {
      const nights = this.calculateNights(start, end);
      if (nights === 0) {
        statusTextEl.textContent = `Mesmo dia: ${this.formatDisplayDate(start)} (0 diárias / Day Use)`;
      } else {
        statusTextEl.textContent = `${nights} ${nights === 1 ? 'diária' : 'diárias'} (${this.formatDisplayDate(start)} ➔ ${this.formatDisplayDate(end)})`;
      }
    }
  }

  /**
   * Commits the selection, updates triggers, syncs hidden inputs, invokes callback, and closes
   */
  commitSelection(start, end) {
    this.committedStartDate = start;
    this.committedEndDate = end;

    if (this.singleMode) {
      if (this.singleInput) this.singleInput.value = start || '';
    } else {
      if (this.checkinInput) this.checkinInput.value = start || '';
      if (this.checkoutInput) this.checkoutInput.value = end || '';
    }

    this.updateTriggerLabels();
    this.close(false);

    if (this.onSelect) {
      if (this.singleMode) {
        this.onSelect(this.committedStartDate);
      } else {
        this.onSelect(this.committedStartDate, this.committedEndDate);
      }
    }
  }
}
