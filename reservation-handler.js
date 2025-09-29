(function () {
  const DATE_INPUT = document.getElementById('reservation-date');
  const DATE_INFO = document.getElementById('date-availability-info');
  const TIME_STEP = document.getElementById('step-time');
  const DATE_STEP = document.getElementById('step-date');
  const DETAILS_STEP = document.getElementById('step-details');
  const CONFIRM_STEP = document.getElementById('step-confirmation');
  const TIME_SLOTS = document.getElementById('time-slots');
  const SLOT_INFO = document.getElementById('slot-info');
  const SUMMARY = document.getElementById('reservation-summary');
  const FEEDBACK = document.getElementById('reservation-feedback');
  const FORM = document.getElementById('reservation-form');
  const WAITLIST_CONSENT = document.getElementById('waitlist-consent');
  const WAITLIST_INPUT = document.getElementById('reservation-waitlist');
  const CONFIRMATION_BOX = document.getElementById('reservation-confirmation');

  const state = {
    meta: null,
    date: null,
    slot: null,
    availability: [],
    waitlistEnabled: false,
    maxGuestsPerReservation: 0
  };

  function setStep(step) {
    [DATE_STEP, TIME_STEP, DETAILS_STEP, CONFIRM_STEP].forEach(section => {
      if (!section) return;
      section.hidden = section.id !== step;
    });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(`${dateString}T12:00:00Z`);
      return new Intl.DateTimeFormat('de-AT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return dateString;
    }
  }

  function resetTimeSelection() {
    state.slot = null;
    if (TIME_SLOTS) TIME_SLOTS.innerHTML = '';
    if (SLOT_INFO) SLOT_INFO.textContent = '';
  }

  async function fetchMeta() {
    try {
      const response = await fetch('/.netlify/functions/get-availability?meta=1');
      if (!response.ok) throw new Error('Meta request failed');
      const data = await response.json();
      state.meta = data.meta || {};
      configureDatePicker();
    } catch (error) {
      console.error('Failed to load reservation metadata', error);
      if (DATE_INFO) {
        DATE_INFO.textContent = 'Die Reservierungsdaten konnten nicht geladen werden. Bitte versuche es später erneut.';
        DATE_INFO.classList.add('error');
      }
    }
  }

  function configureDatePicker() {
    if (!DATE_INPUT) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let minDate = new Date(today);
    const leadTime = Number(state.meta?.leadTimeDays || 0);
    if (leadTime > 0) {
      minDate.setDate(minDate.getDate() + leadTime);
    }
    const bookingWindow = Number(state.meta?.bookingWindowDays || 0);
    let maxDate = null;
    if (bookingWindow > 0) {
      maxDate = new Date(minDate);
      maxDate.setDate(minDate.getDate() + bookingWindow);
    }

    DATE_INPUT.min = minDate.toISOString().slice(0, 10);
    if (maxDate) {
      DATE_INPUT.max = maxDate.toISOString().slice(0, 10);
    }

    if (DATE_INFO) {
      const infoParts = [];
      infoParts.push(`Reservierungen sind ab ${formatDate(DATE_INPUT.min)} möglich.`);
      if (maxDate) {
        infoParts.push(`Du kannst bis ${formatDate(DATE_INPUT.max)} planen.`);
      }
      DATE_INFO.textContent = infoParts.join(' ');
    }
  }

  function renderSlots(availability) {
    if (!TIME_SLOTS) return;
    TIME_SLOTS.innerHTML = '';

    if (!availability || availability.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'step-help';
      placeholder.textContent = 'Für dieses Datum wurden keine Slots hinterlegt.';
      TIME_SLOTS.appendChild(placeholder);
      return;
    }

    availability.forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-slot';
      button.setAttribute('role', 'listitem');
      button.dataset.time = slot.time;
      button.dataset.available = slot.availableGuests;
      button.disabled = slot.isFull && !state.meta?.waitlistEnabled;

      if (slot.isFull) {
        button.classList.add('booked');
      } else {
        button.classList.add('available');
      }

      button.innerHTML = `
        <span class="time-slot-time">${slot.time}</span>
        <span class="time-slot-capacity">${slot.isFull ? 'ausgebucht' : `${slot.availableGuests} Plätze frei`}</span>
      `;

      button.addEventListener('click', () => {
        state.slot = slot;
        Array.from(TIME_SLOTS.querySelectorAll('.time-slot')).forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        updateSummary();
        setStep('step-details');
      });

      TIME_SLOTS.appendChild(button);
    });
  }

  function updateSummary() {
    if (!SUMMARY) return;
    if (!state.date || !state.slot) {
      SUMMARY.innerHTML = '';
      return;
    }

    const guestsInput = FORM?.elements?.guests;
    const guestsValue = guestsInput && guestsInput.value ? guestsInput.value : '';

    let guestMarkup = '';
    if (guestsValue) {
      guestMarkup = `
        <div class="summary-entry">
          <span class="summary-label">Personen</span>
          <span class="summary-value">${guestsValue}</span>
        </div>
      `;
    }

    SUMMARY.innerHTML = `
      <div class="summary-entry">
        <span class="summary-label">Datum</span>
        <span class="summary-value">${formatDate(state.date)}</span>
      </div>
      <div class="summary-entry">
        <span class="summary-label">Zeit</span>
        <span class="summary-value">${state.slot.time} Uhr</span>
      </div>
      ${guestMarkup}
    `;

    if (state.slot.isFull && state.waitlistEnabled) {
      WAITLIST_CONSENT.hidden = false;
      WAITLIST_INPUT.checked = true;
    } else {
      WAITLIST_INPUT.checked = false;
      WAITLIST_CONSENT.hidden = !state.waitlistEnabled;
    }
  }

  async function handleDateChange(event) {
    const value = event.target.value;
    resetTimeSelection();
    state.date = null;

    if (!value) {
      if (DATE_INFO) DATE_INFO.textContent = 'Bitte wähle ein Datum aus.';
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/get-availability?date=${value}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Verfügbarkeit nicht abrufbar');
      }

      state.date = value;
      state.availability = data.slots || [];
      state.waitlistEnabled = Boolean(data.waitlistEnabled);
      state.meta = {
        ...(state.meta || {}),
        waitlistEnabled: state.waitlistEnabled
      };
      state.maxGuestsPerReservation = Number(data.maxGuestsPerReservation || 0);

      if (DATE_INFO) {
        DATE_INFO.textContent = data.closed
          ? data.reason || 'An diesem Tag können keine Reservierungen vorgenommen werden.'
          : `Verfügbare Slots für ${formatDate(value)}.`;
      }

      if (data.closed) {
        setStep('step-date');
        return;
      }

      renderSlots(state.availability);
      setStep('step-time');
      if (SLOT_INFO) {
        const capacityHint = state.maxGuestsPerReservation > 0
          ? `Maximal ${state.maxGuestsPerReservation} Personen pro Reservierung.`
          : 'Bis zu 10 Personen pro Reservierung möglich.';
        SLOT_INFO.textContent = capacityHint;
      }
    } catch (error) {
      console.error('Failed to fetch availability', error);
      if (DATE_INFO) {
        DATE_INFO.textContent = 'Die Verfügbarkeit konnte nicht geladen werden. Bitte versuche es erneut.';
      }
    }
  }

  function handleBack(event) {
    const target = event.target.closest('[data-back]');
    if (!target) return;
    const step = target.getAttribute('data-back');
    if (step === 'date') {
      setStep('step-date');
    } else if (step === 'time') {
      setStep('step-time');
    }
  }

  function validateForm() {
    if (!FORM) return false;
    let valid = true;
    const inputs = Array.from(FORM.querySelectorAll('input, textarea'));
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        input.classList.add('has-error');
        valid = false;
      } else {
        input.classList.remove('has-error');
      }
    });
    return valid;
  }

  function disableForm(disabled) {
    if (!FORM) return;
    Array.from(FORM.elements).forEach(element => {
      element.disabled = disabled;
    });
  }

  function buildPayload() {
    const formData = new FormData(FORM);
    const payload = Object.fromEntries(formData.entries());
    payload.date = state.date;
    payload.time = state.slot?.time;
    payload.guests = formData.get('guests');
    payload.join_waitlist = formData.get('join_waitlist') === 'on';
    delete payload.privacy;
    return payload;
  }

  function renderConfirmation(reservation) {
    if (!CONFIRMATION_BOX) return;
    const statusText = reservation.status === 'waitlist'
      ? 'Du stehst jetzt auf unserer Warteliste. Wir informieren dich, sobald ein Platz frei wird.'
      : 'Wir freuen uns auf dich – deine Reservierung ist bestätigt!';

    CONFIRMATION_BOX.innerHTML = `
      <div class="confirmation-card">
        <h3>${statusText}</h3>
        <ul>
          <li><strong>Reservierungscode:</strong> ${reservation.confirmationCode}</li>
          <li><strong>Datum:</strong> ${formatDate(reservation.date)}</li>
          <li><strong>Uhrzeit:</strong> ${reservation.time} Uhr</li>
          <li><strong>Personen:</strong> ${reservation.guests}</li>
        </ul>
        <p>Eine Bestätigung wurde an ${reservation.email} gesendet.</p>
      </div>
    `;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!state.date || !state.slot) {
      return;
    }

    if (!validateForm()) {
      if (FEEDBACK) {
        FEEDBACK.textContent = 'Bitte überprüfe deine Eingaben.';
        FEEDBACK.classList.add('error');
      }
      return;
    }

    disableForm(true);
    if (FEEDBACK) {
      FEEDBACK.textContent = 'Wir prüfen deine Reservierung…';
      FEEDBACK.classList.remove('error');
      FEEDBACK.classList.remove('success');
    }

    try {
      const payload = buildPayload();
      const response = await fetch('/.netlify/functions/create-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Reservierung fehlgeschlagen');
      }

      if (FEEDBACK) {
        FEEDBACK.textContent = data.message || 'Reservierung erfolgreich.';
        FEEDBACK.classList.remove('error');
        FEEDBACK.classList.add('success');
      }

      renderConfirmation(data.reservation);
      setStep('step-confirmation');
      FORM.reset();
      WAITLIST_CONSENT.hidden = true;
      state.date = null;
      state.slot = null;
      DATE_INPUT.value = '';
    } catch (error) {
      console.error('Reservation failed', error);
      if (FEEDBACK) {
        FEEDBACK.textContent = error.message || 'Die Reservierung konnte nicht abgeschlossen werden.';
        FEEDBACK.classList.add('error');
      }
    } finally {
      disableForm(false);
    }
  }

  function init() {
    if (!DATE_INPUT || !FORM) return;

    fetchMeta();
    DATE_INPUT.addEventListener('change', handleDateChange);
    document.addEventListener('click', handleBack);
    FORM.addEventListener('submit', handleSubmit);
    FORM.addEventListener('input', updateSummary);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
