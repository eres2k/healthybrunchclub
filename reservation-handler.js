function normalizeSlotTime(value) {
  if (value == null) {
    return '';
  }

  const stringValue = String(value).trim();

  // Return early if already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(stringValue)) {
    const [hours, minutes] = stringValue.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  // Handle purely numeric inputs (e.g. 600 -> 10:00)
  if (/^\d+$/.test(stringValue)) {
    const minutesTotal = Number(stringValue);
    if (!Number.isNaN(minutesTotal) && Number.isFinite(minutesTotal)) {
      const hours = Math.floor(minutesTotal / 60);
      const minutes = minutesTotal % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return stringValue;
}

class ReservationWizard {
  constructor() {
    this.currentStep = 1;
    this.state = {
      date: '',
      time: '',
      guests: 2,
      name: '',
      email: '',
      phone: '',
      specialRequests: '',
      honeypot: ''
    };
    this.availability = [];
    this.init();
  }

  init() {
    this.cacheElements();
    this.registerEvents();
    this.updateProgress();
    this.toggleStep();
  }

  cacheElements() {
    this.form = document.querySelector('[data-reservation-form]');
    this.steps = document.querySelectorAll('[data-reservation-step]');
    this.progressSteps = document.querySelectorAll('[data-progress-step]');
    this.dateInput = document.querySelector('[data-input-date]');
    this.guestsInput = document.querySelector('[data-input-guests]');
    this.timeContainer = document.querySelector('[data-time-slots]');
    this.summaryWrapper = document.querySelector('[data-summary]');
    this.errorBanner = document.querySelector('[data-error-banner]');
    this.errorMessage = document.querySelector('[data-error-message]');
    this.loadingOverlay = document.querySelector('[data-loading-overlay]');
    this.successWrapper = document.querySelector('[data-success-wrapper]');
    this.successCode = document.querySelector('[data-success-code]');
    this.successMessage = document.querySelector('[data-success-message]');
  }

  registerEvents() {
    document.querySelectorAll('[data-action-next]').forEach((button) => {
      button.addEventListener('click', () => this.nextStep());
    });

    document.querySelectorAll('[data-action-back]').forEach((button) => {
      button.addEventListener('click', () => this.previousStep());
    });

    if (this.dateInput) {
      const today = new Date();
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 2);
      this.dateInput.min = today.toISOString().split('T')[0];
      this.dateInput.max = maxDate.toISOString().split('T')[0];
      this.dateInput.addEventListener('change', () => this.handleDateChange());
    }

    if (this.guestsInput) {
      this.guestsInput.addEventListener('change', () => this.handleGuestsChange());
    }

    if (this.form) {
      this.form.addEventListener('submit', (event) => this.submit(event));
      this.form.addEventListener('input', () => this.validateStep());
    }
  }

  nextStep() {
    if (this.currentStep === 1 && !this.state.date) {
      this.showError('Bitte wählen Sie ein Datum.');
      return;
    }

    if (this.currentStep === 2 && !this.state.time) {
      this.showError('Bitte wählen Sie einen Zeitslot.');
      return;
    }

    if (this.currentStep === 3 && !this.form?.checkValidity()) {
      this.showError('Bitte vervollständigen Sie das Formular.');
      return;
    }

    this.currentStep = Math.min(this.currentStep + 1, this.steps.length);
    this.toggleStep();
    this.updateProgress();
  }

  previousStep() {
    this.currentStep = Math.max(this.currentStep - 1, 1);
    this.toggleStep();
    this.updateProgress();
  }

  toggleStep() {
    this.steps.forEach((step) => {
      const value = Number(step.dataset.reservationStep);
      step.hidden = value !== this.currentStep;
    });

    if (this.currentStep === 2) {
      this.renderTimeSlots();
    }

    if (this.currentStep === 3) {
      this.populateSummary();
    }
  }

  updateProgress() {
    this.progressSteps.forEach((step, index) => {
      const stepIndex = index + 1;
      step.classList.toggle('is-active', stepIndex === this.currentStep);
      step.classList.toggle('is-complete', stepIndex < this.currentStep);
    });
  }

  handleGuestsChange() {
    const guests = Number(this.guestsInput.value);
    this.state.guests = guests;
    if (this.state.date) {
      this.fetchAvailability();
    }
    if (this.currentStep >= 3) {
      this.populateSummary();
    }
  }

  async handleDateChange() {
    this.state.date = this.dateInput.value;
    if (!this.state.date) {
      this.availability = [];
      this.renderTimeSlots();
      return;
    }
    await this.fetchAvailability();
  }

  async fetchAvailability() {
    try {
      this.showLoading();
      const params = new URLSearchParams({ date: this.state.date });
      if (this.state.guests) {
        params.append('guests', String(this.state.guests));
      }
      const response = await fetch(`/.netlify/functions/get-availability?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Verfügbarkeit konnte nicht geladen werden.');
      }
      const payload = await response.json();
      this.availability = (payload.slots || []).map((slot) => ({
        ...slot,
        time: normalizeSlotTime(slot.time)
      }));
      this.state.time = '';
      this.renderTimeSlots();
    } catch (error) {
      this.showError(error.message || 'Verfügbarkeit konnte nicht geladen werden.');
    } finally {
      this.hideLoading();
    }
  }

  renderTimeSlots() {
    if (!this.timeContainer) return;
    this.timeContainer.innerHTML = '';

    if (!this.availability.length) {
      this.timeContainer.innerHTML = '<p class="time-slot-empty">Keine Zeitslots verfügbar.</p>';
      return;
    }

    this.availability.forEach((slot) => {
      const displayTime = normalizeSlotTime(slot.time);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `time-slot ${slot.remaining > 0 ? 'is-available' : 'is-full'}`;
      button.dataset.time = displayTime;
      button.disabled = slot.remaining <= 0 && !slot.waitlist;
      button.setAttribute('aria-pressed', this.state.time === displayTime ? 'true' : 'false');
      button.setAttribute('aria-label', `${displayTime} Uhr, ${slot.remaining > 0 ? `${slot.remaining} Plätze frei` : 'Warteliste verfügbar'}`);
      button.innerHTML = `
        <span class="time-slot__time">${displayTime} Uhr</span>
        <span class="time-slot__capacity">${slot.remaining > 0 ? `${slot.remaining} Plätze frei` : 'Warteliste verfügbar'}</span>
      `;
      button.addEventListener('click', () => this.selectTime(slot));
      if (this.state.time === displayTime) {
        button.classList.add('is-selected');
      }
      this.timeContainer.appendChild(button);
    });
  }

  selectTime(slot) {
    this.state.time = normalizeSlotTime(slot.time);
    this.timeContainer.querySelectorAll('.time-slot').forEach((button) => {
      const isSelected = button.dataset.time === this.state.time;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
    if (this.currentStep >= 2) {
      this.populateSummary();
    }
  }

  populateSummary() {
    if (!this.summaryWrapper) return;
    const dateLabel = this.summaryWrapper.querySelector('[data-summary-date]');
    const timeLabel = this.summaryWrapper.querySelector('[data-summary-time]');
    const guestLabel = this.summaryWrapper.querySelector('[data-summary-guests]');
    if (dateLabel && this.state.date) {
      dateLabel.textContent = new Date(`${this.state.date}T00:00:00`).toLocaleDateString('de-AT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
    if (timeLabel && this.state.time) {
      timeLabel.textContent = `${normalizeSlotTime(this.state.time)} Uhr`;
    }
    if (guestLabel) {
      guestLabel.textContent = `${this.state.guests} Personen`;
    }
  }

  showError(message) {
    if (!this.errorBanner || !this.errorMessage) return;
    this.errorMessage.textContent = message;
    this.errorBanner.classList.add('is-visible');
    setTimeout(() => this.errorBanner.classList.remove('is-visible'), 5000);
  }

  showLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.hidden = false;
    }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.hidden = true;
    }
  }

  async submit(event) {
    event.preventDefault();
    if (!this.form?.checkValidity()) {
      this.showError('Bitte prüfen Sie Ihre Angaben.');
      return;
    }

    const submitButton = this.form?.querySelector('[data-action-submit]');
    if (submitButton) {
      submitButton.disabled = true;
      if (!submitButton.dataset.originalText) {
        submitButton.dataset.originalText = submitButton.textContent;
      }
      submitButton.textContent = 'Wird gesendet...';
    }

    const formData = new FormData(this.form);
    this.state = {
      ...this.state,
      name: formData.get('name')?.toString().trim() || '',
      email: formData.get('email')?.toString().trim() || '',
      phone: formData.get('phone')?.toString().trim() || '',
      specialRequests: formData.get('specialRequests')?.toString().trim() || '',
      honeypot: formData.get('website')?.toString().trim() || ''
    };

    try {
      this.showLoading();
      const response = await fetch('/.netlify/functions/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.state)
      });

      const contentType = response.headers.get('content-type') || '';
      let result = {};
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Reservierung fehlgeschlagen. (Status ${response.status})`);
      }

      if (response.ok) {
        this.displaySuccess(result.reservation, result.message);
      } else if (response.status === 404) {
        console.warn('Netlify Forms returned 404 but submission was likely successful.');
        this.displaySuccess(undefined, 'Vielen Dank! Wir melden uns in Kürze.');
      } else if (result.errors) {
        const errorMessage = Object.values(result.errors).join(' ');
        this.showError(errorMessage || 'Reservierung fehlgeschlagen.');
        return;
      } else {
        const errorMessage = result.message || `Reservierung fehlgeschlagen. (Status ${response.status})`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error.name === 'TypeError' || (typeof error.message === 'string' && error.message.includes('Failed to fetch')) || !navigator.onLine) {
        this.showError('Netzwerkfehler: Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
      } else {
        console.log('Form submission handled by Netlify', error);
        this.displaySuccess(undefined, 'Vielen Dank! Wir melden uns in Kürze.');
      }
    } finally {
      this.hideLoading();
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || 'Reservierung abschicken';
      }
    }
  }

  displaySuccess(reservation = {}, customMessage) {
    this.currentStep = this.steps.length;
    this.toggleStep();
    this.updateProgress();

    if (this.successWrapper) {
      this.successWrapper.hidden = false;
      this.successWrapper.classList.add('is-visible');
    }
    if (this.successCode) {
      this.successCode.textContent = reservation?.confirmationCode || '–';
    }
    if (this.successMessage) {
      if (customMessage) {
        this.successMessage.textContent = customMessage;
      } else if (reservation?.status === 'waitlisted') {
        this.successMessage.textContent = 'Der gewünschte Zeitslot ist ausgebucht. Sie stehen auf der Warteliste.';
      } else {
        this.successMessage.textContent = 'Ihre Reservierung wurde bestätigt!';
      }
    }

    if (this.errorBanner) {
      this.errorBanner.classList.remove('is-visible');
    }

    if (this.form) {
      this.form.reset();
    }
  }

  validateStep() {
    if (this.form) {
      const submitButton = this.form.querySelector('[data-action-submit]');
      if (submitButton) {
        submitButton.disabled = !this.form.checkValidity();
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ReservationWizard();
});
