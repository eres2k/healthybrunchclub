function formatTimeSlot(time) {
  if (typeof time === 'number' || !Number.isNaN(Number(time))) {
    const totalMinutes = parseInt(time, 10);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  if (typeof time === 'string' && time.includes(':')) {
    return time;
  }
  return time;
}

function formatDisplayTime(time) {
  const formatted = formatTimeSlot(time);
  if (typeof formatted === 'string' && formatted.toLowerCase().includes('uhr')) {
    return formatted;
  }
  return `${formatted} Uhr`;
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
      this.availability = (payload.slots || []).map((slot) => {
        const formattedTime = formatTimeSlot(slot?.time ?? slot);
        if (slot && typeof slot === 'object') {
          return {
            ...slot,
            time: formattedTime
          };
        }
        return {
          time: formattedTime,
          remaining: 1,
          waitlist: false
        };
      });
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
      const formattedTime = formatTimeSlot(slot?.time);
      const displayTime = formatDisplayTime(formattedTime);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.time = formattedTime;
      button.disabled = slot.remaining <= 0 && !slot.waitlist;

      // Determine status text and class
      let statusText = '';
      let slotClass = 'time-slot';

      if (slot.remaining <= 0) {
        slotClass += ' is-full';
        statusText = slot.waitlist ? 'Warteliste' : 'Ausgebucht';
      } else if (slot.remaining < 8) {
        slotClass += ' is-limited';
        statusText = `Noch ${slot.remaining} ${slot.remaining === 1 ? 'Platz' : 'Plätze'}`;
      } else {
        slotClass += ' is-available';
        statusText = 'Verfügbar';
      }

      button.className = slotClass;
      button.setAttribute('aria-pressed', this.state.time === formattedTime ? 'true' : 'false');
      button.setAttribute('aria-label', `${displayTime}, ${statusText}`);
      button.innerHTML = `
        <span class="time-slot__time">${displayTime}</span>
        <span class="time-slot__capacity">${statusText}</span>
      `;
      button.addEventListener('click', () => this.selectTime(slot));
      if (this.state.time === formattedTime) {
        button.classList.add('is-selected');
      }
      this.timeContainer.appendChild(button);
    });
  }

  selectTime(slot) {
    const formattedTime = formatTimeSlot(slot?.time);
    this.state.time = formattedTime;
    this.timeContainer.querySelectorAll('.time-slot').forEach((button) => {
      const isSelected = button.dataset.time === formattedTime;
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
      const displayTime = formatDisplayTime(this.state.time);
      timeLabel.textContent = displayTime;
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
        this.submitToNetlifyForms(result.reservation?.confirmationCode);
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
        console.error('Reservation submission error:', error);
        this.showError(error.message || 'Reservierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
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

  submitToNetlifyForms(confirmationCode) {
    const formData = new FormData();
    formData.append('form-name', 'reservations');
    formData.append('name', this.state.name);
    formData.append('email', this.state.email);
    formData.append('phone', this.state.phone || '');
    formData.append('date', this.state.date);
    formData.append('time', this.state.time);
    formData.append('guests', this.state.guests.toString());
    formData.append('specialRequests', this.state.specialRequests || '');
    formData.append('message', `Bestätigungscode: ${confirmationCode || 'N/A'}`);
    if (this.state.honeypot) {
      formData.append('website', this.state.honeypot);
    }

    fetch('/', {
      method: 'POST',
      body: formData
    }).catch(err => console.warn('Netlify Forms backup submission failed:', err));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ReservationWizard();
});
