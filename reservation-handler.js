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
      this.availability = payload.slots || [];
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
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `time-slot ${slot.remaining > 0 ? 'is-available' : 'is-full'}`;
      button.dataset.time = slot.time;
      button.disabled = slot.remaining <= 0 && !slot.waitlist;
      button.setAttribute('aria-pressed', this.state.time === slot.time ? 'true' : 'false');
      button.setAttribute('aria-label', `${slot.time} Uhr, ${slot.remaining > 0 ? `${slot.remaining} Plätze frei` : 'Warteliste verfügbar'}`);
      button.innerHTML = `
        <span class="time-slot__time">${slot.time} Uhr</span>
        <span class="time-slot__capacity">${slot.remaining > 0 ? `${slot.remaining} Plätze frei` : 'Warteliste verfügbar'}</span>
      `;
      button.addEventListener('click', () => this.selectTime(slot));
      if (this.state.time === slot.time) {
        button.classList.add('is-selected');
      }
      this.timeContainer.appendChild(button);
    });
  }

  selectTime(slot) {
    this.state.time = slot.time;
    this.timeContainer.querySelectorAll('.time-slot').forEach((button) => {
      const isSelected = button.dataset.time === slot.time;
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
      timeLabel.textContent = `${this.state.time} Uhr`;
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

    const formData = new FormData(this.form);
    this.state = {
      ...this.state,
      name: formData.get('name')?.toString().trim() || '',
      email: formData.get('email')?.toString().trim() || '',
      phone: formData.get('phone')?.toString().trim() || '',
      specialRequests: formData.get('specialRequests')?.toString().trim() || '',
      honeypot: formData.get('website')?.toString().trim() || ''
    };

    const payload = {
      name: this.state.name,
      email: this.state.email,
      phone: this.state.phone,
      date: this.state.date,
      time: this.state.time,
      guests: this.state.guests,
      message: this.state.specialRequests,
      'bot-field': this.state.honeypot
    };

    try {
      this.showLoading();
      const response = await fetch('/.netlify/functions/create-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || result?.error) {
        throw new Error(result?.error || result?.message || 'Reservierung fehlgeschlagen.');
      }

      this.displaySuccess(result.reservation, result.message);
    } catch (error) {
      this.showError(error.message || 'Reservierung fehlgeschlagen.');
    } finally {
      this.hideLoading();
    }
  }

  displaySuccess(reservation, message) {
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
      if (reservation?.status === 'waitlisted') {
        this.successMessage.textContent = 'Der gewünschte Zeitslot ist ausgebucht. Sie stehen auf der Warteliste.';
      } else if (reservation) {
        this.successMessage.textContent = 'Ihre Reservierung wurde bestätigt!';
      } else {
        this.successMessage.textContent = message || 'Ihre Reservierung wurde erfolgreich übermittelt!';
      }
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
