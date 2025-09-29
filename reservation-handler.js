(function () {
  const API_AVAILABILITY = '/.netlify/functions/get-availability';
  const API_RESERVATION = '/.netlify/functions/create-reservation';

  const dateStep = document.getElementById('step-date');
  const timeStep = document.getElementById('step-time');
  const detailStep = document.getElementById('step-details');
  const confirmationStep = document.getElementById('step-confirmation');

  const dateInput = document.getElementById('reservation-date');
  const timeSlotsContainer = document.getElementById('time-slots');
  const hintContainer = document.getElementById('reservation-hint');
  const dateInfo = document.getElementById('date-availability-info');
  const form = document.getElementById('reservation-form');
  const formStatus = document.getElementById('form-status');
  const guestsInput = document.getElementById('reservation-guests');
  const changeDateButton = document.getElementById('change-date');
  const backToTimeButton = document.getElementById('back-to-time');
  const bookAnotherButton = document.getElementById('book-another');
  const confirmationMessage = confirmationStep ? confirmationStep.querySelector('.confirmation-message') : null;

  const state = {
    metadata: null,
    selectedDate: null,
    selectedSlot: null,
    availability: null
  };

  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  function addDays(date, days) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  function setHint(message, type = 'info') {
    if (!hintContainer) return;
    if (!message) {
      hintContainer.textContent = '';
      hintContainer.className = 'reservation-hint';
      return;
    }

    hintContainer.textContent = message;
    hintContainer.className = `reservation-hint ${type}`;
  }

  function toggleStep(step, visible) {
    if (!step) return;
    if (visible) {
      step.removeAttribute('hidden');
    } else {
      step.setAttribute('hidden', '');
    }
  }

  function resetSlots() {
    timeSlotsContainer.innerHTML = '';
    state.selectedSlot = null;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        message = JSON.parse(text);
      } catch (error) {
        // ignore
      }
      const err = new Error('Request failed');
      err.response = response;
      err.payload = message;
      throw err;
    }
    return response.json();
  }

  function isBlackout(date) {
    if (!state.metadata || !Array.isArray(state.metadata.blackoutDates)) {
      return false;
    }
    return state.metadata.blackoutDates.includes(date);
  }

  function showAvailabilityStatus(availability) {
    if (!dateInfo) return;
    let message;
    let tone = 'success';

    if (availability.status !== 'open') {
      message = availability.message || 'Für dieses Datum stehen aktuell keine Reservierungen zur Verfügung.';
      tone = 'warning';
    } else {
      const slotsAvailable = availability.slots.filter((slot) => slot.status === 'available' && slot.remaining > 0).length;
      if (slotsAvailable > 0) {
        message = `${slotsAvailable} verfügbare Zeitfenster für diesen Tag.`;
      } else {
        message = 'Derzeit keine freien Plätze – Sie können sich auf die Warteliste setzen lassen.';
        tone = 'warning';
      }
    }

    if (availability.note) {
      message += ` ${availability.note}`;
    }

    dateInfo.textContent = message;
    dateInfo.className = `step-info ${tone}`;
  }

  function buildSlotButton(slot) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `time-slot time-slot--${slot.status}`;
    button.textContent = `${slot.time} Uhr`;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.dataset.time = slot.time;
    button.dataset.capacity = slot.capacity;
    button.dataset.remaining = slot.remaining;

    let tooltip = '';
    if (slot.status === 'full') {
      tooltip = 'Ausgebucht';
    } else if (slot.status === 'tooSoon') {
      tooltip = slot.disabledReason || 'Reservierung zu kurzfristig';
    } else if (slot.status === 'tooSmall') {
      tooltip = 'Nicht genügend Plätze für die gewünschte Gruppengröße';
    } else if (slot.remaining <= 3) {
      tooltip = `Nur noch ${slot.remaining} Plätze verfügbar`;
    }

    if (tooltip) {
      button.title = tooltip;
    }

    if (slot.status !== 'available' && !slot.waitlistAvailable) {
      button.disabled = true;
    }

    button.addEventListener('click', () => {
      document.querySelectorAll('.time-slot[aria-checked="true"]').forEach((active) => {
        active.classList.remove('selected');
        active.setAttribute('aria-checked', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-checked', 'true');
      state.selectedSlot = slot;
      toggleStep(detailStep, true);
      detailStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return button;
  }

  async function loadAvailability(date) {
    if (!date) return;
    if (isBlackout(date)) {
      dateInfo.textContent = 'An diesem Tag bleibt der Healthy Brunch Club geschlossen.';
      dateInfo.className = 'step-info warning';
      resetSlots();
      toggleStep(timeStep, false);
      toggleStep(detailStep, false);
      return;
    }

    try {
      dateInfo.textContent = 'Prüfe Verfügbarkeiten …';
      dateInfo.className = 'step-info loading';
      resetSlots();
      toggleStep(detailStep, false);

      const guests = guestsInput && guestsInput.value ? `&guests=${encodeURIComponent(guestsInput.value)}` : '';
      const data = await fetchJson(`${API_AVAILABILITY}?date=${date}${guests}`);
      state.availability = data;
      showAvailabilityStatus(data);

      if (data.status !== 'open') {
        toggleStep(timeStep, false);
        return;
      }

      const fragment = document.createDocumentFragment();
      data.slots.forEach((slot) => {
        const button = buildSlotButton(slot);
        fragment.appendChild(button);
      });

      timeSlotsContainer.appendChild(fragment);
      toggleStep(timeStep, true);
      timeStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error(error);
      dateInfo.textContent = 'Die Verfügbarkeit konnte nicht geladen werden. Bitte versuchen Sie es erneut.';
      dateInfo.className = 'step-info error';
    }
  }

  function resetForm() {
    state.selectedDate = null;
    state.selectedSlot = null;
    state.availability = null;
    if (form) {
      form.reset();
    }
    resetSlots();
    toggleStep(timeStep, false);
    toggleStep(detailStep, false);
    toggleStep(confirmationStep, false);
  }

  async function submitReservation(event) {
    event.preventDefault();
    if (!state.selectedDate || !state.selectedSlot) {
      formStatus.textContent = 'Bitte wählen Sie zuerst Datum und Uhrzeit.';
      formStatus.className = 'form-status error';
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const payload = {
      date: state.selectedDate,
      time: state.selectedSlot.time,
      guests: Number(formData.get('guests')),
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      notes: formData.get('notes')
    };

    formStatus.textContent = 'Reservierung wird übermittelt …';
    formStatus.className = 'form-status loading';

    try {
      const response = await fetchJson(API_RESERVATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const { reservation } = response;
      const statusText = reservation.status === 'waitlist'
        ? 'Sie wurden erfolgreich auf die Warteliste gesetzt.'
        : 'Ihre Reservierung wurde bestätigt.';

      if (confirmationMessage) {
        const helperMessage = response.message ? `<p>${response.message}</p>` : '';
        confirmationMessage.innerHTML = `
          <h3>${statusText}</h3>
          <p><strong>Datum:</strong> ${reservation.date}</p>
          <p><strong>Zeit:</strong> ${reservation.time} Uhr</p>
          <p><strong>Personen:</strong> ${reservation.guests}</p>
          <p><strong>Buchungs-ID:</strong> ${reservation.id}</p>
          ${helperMessage}
        `;
      }

      toggleStep(detailStep, false);
      toggleStep(timeStep, false);
      toggleStep(confirmationStep, true);
      confirmationStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
      formStatus.textContent = '';
      formStatus.className = 'form-status';
    } catch (error) {
      const message = error.payload?.message || 'Die Reservierung konnte nicht abgeschlossen werden.';
      formStatus.textContent = message;
      formStatus.className = 'form-status error';
    }
  }

  async function initialise() {
    if (!dateInput) return;
    try {
      const metadata = await fetchJson(API_AVAILABILITY);
      state.metadata = metadata;
      const today = new Date();
      const minDate = formatDate(today);
      dateInput.min = minDate;

      if (metadata.maxDaysInAdvance) {
        dateInput.max = formatDate(addDays(today, metadata.maxDaysInAdvance));
      }

      const hints = [];
      if (metadata.guestNotes) {
        hints.push(metadata.guestNotes);
      }
      if (metadata.waitlistEnabled) {
        hints.push('Ausgebuchte Slots können als Warteliste gebucht werden.');
      }
      setHint(hints.join(' '), 'info');

      if (metadata.maxGuestsPerReservation && guestsInput) {
        guestsInput.max = metadata.maxGuestsPerReservation;
      }
    } catch (error) {
      console.error('Konnte Reservierungseinstellungen nicht laden', error);
      setHint('Reservierungssystem momentan nicht verfügbar. Bitte versuchen Sie es später erneut.', 'error');
    }
  }

  if (dateInput) {
    dateInput.addEventListener('change', (event) => {
      const value = event.target.value;
      state.selectedDate = value;
      if (!value) {
        resetSlots();
        toggleStep(timeStep, false);
        toggleStep(detailStep, false);
        return;
      }
      loadAvailability(value);
    });
  }

  if (changeDateButton) {
    changeDateButton.addEventListener('click', () => {
      toggleStep(timeStep, false);
      toggleStep(detailStep, false);
      dateInput.focus();
    });
  }

  if (backToTimeButton) {
    backToTimeButton.addEventListener('click', () => {
      toggleStep(detailStep, false);
      toggleStep(timeStep, true);
      timeStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (bookAnotherButton) {
    bookAnotherButton.addEventListener('click', () => {
      resetForm();
      dateInput.focus();
    });
  }

  if (guestsInput) {
    guestsInput.addEventListener('change', () => {
      if (state.selectedDate) {
        loadAvailability(state.selectedDate);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', submitReservation);
  }

  document.addEventListener('DOMContentLoaded', initialise);
})();
