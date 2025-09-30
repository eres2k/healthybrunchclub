/**
 * Healthy Brunch Club - Reservation System Handler
 * Complete reservation logic with CMS integration
 */

class ReservationSystem {
    constructor() {
        this.currentStep = 1;
        this.reservationData = {
            date: null,
            time: null,
            guests: null,
            name: null,
            email: null,
            phone: null,
            specialRequests: null
        };
        this.availableSlots = [];
        
        this.init();
    }

    init() {
        this.setupDatePicker();
        this.setupEventListeners();
        this.updateProgressIndicator();
    }

    setupDatePicker() {
        const dateInput = document.getElementById('reservation-date');
        if (!dateInput) return;

        // Set min date to today
        const today = new Date();
        dateInput.min = this.formatDate(today);

        // Set max date to 30 days from now
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        dateInput.max = this.formatDate(maxDate);

        // Add change listener
        dateInput.addEventListener('change', () => this.handleDateSelection());
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('btn-next-date')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-next-time')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-back-time')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-back-details')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-submit-reservation')?.addEventListener('click', (e) => this.submitReservation(e));

        // Form validation
        const form = document.getElementById('reservation-form');
        if (form) {
            form.addEventListener('input', () => this.validateForm());
        }
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('de-AT', options);
    }

    async handleDateSelection() {
        const dateInput = document.getElementById('reservation-date');
        const dateValue = dateInput.value;
        
        if (!dateValue) {
            document.getElementById('btn-next-date').disabled = true;
            return;
        }

        this.reservationData.date = dateValue;
        
        // Show loading
        this.showLoading();
        
        try {
            // Fetch available slots from API
            const response = await fetch('/.netlify/functions/get-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ date: dateValue })
            });

            const data = await response.json();
            
            if (!data.available) {
                this.showDateInfo(data.reason || 'Keine Verfügbarkeit an diesem Tag');
                document.getElementById('btn-next-date').disabled = true;
            } else {
                this.availableSlots = data.slots;
                this.showDateInfo(`${data.slots.length} Zeitslots verfügbar`);
                document.getElementById('btn-next-date').disabled = false;
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
            this.showError('Fehler beim Abrufen der Verfügbarkeit. Bitte versuchen Sie es erneut.');
            document.getElementById('btn-next-date').disabled = true;
        } finally {
            this.hideLoading();
        }
    }

    showDateInfo(message) {
        const infoEl = document.getElementById('date-availability-info');
        if (infoEl) {
            infoEl.textContent = message;
            infoEl.classList.add('show');
        }
    }

    renderTimeSlots() {
        const container = document.getElementById('time-slots');
        const selectedDateDisplay = document.getElementById('selected-date-display');
        
        if (!container) return;
        
        // Update selected date display
        if (selectedDateDisplay && this.reservationData.date) {
            selectedDateDisplay.textContent = this.formatDateDisplay(this.reservationData.date);
        }
        
        // Clear existing slots
        container.innerHTML = '';
        
        // Render slots
        this.availableSlots.forEach(slot => {
            const slotEl = document.createElement('div');
            slotEl.className = `time-slot ${slot.available ? 'available' : 'unavailable'}`;
            slotEl.dataset.time = slot.time;
            
            slotEl.innerHTML = `
                <div class="time-slot-time">${slot.time}</div>
                <div class="time-slot-availability">
                    ${slot.available ? `${slot.availableSeats} Plätze frei` : 'Ausgebucht'}
                </div>
            `;
            
            if (slot.available) {
                slotEl.addEventListener('click', () => this.selectTimeSlot(slot.time));
            }
            
            container.appendChild(slotEl);
        });
    }

    selectTimeSlot(time) {
        // Remove previous selection
        document.querySelectorAll('.time-slot').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to clicked slot
        const selectedSlot = document.querySelector(`.time-slot[data-time="${time}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
        }
        
        this.reservationData.time = time;
        document.getElementById('btn-next-time').disabled = false;
    }

    updateSummary() {
        const summaryDate = document.getElementById('summary-date');
        const summaryTime = document.getElementById('summary-time');
        
        if (summaryDate && this.reservationData.date) {
            summaryDate.textContent = this.formatDateDisplay(this.reservationData.date);
        }
        
        if (summaryTime && this.reservationData.time) {
            summaryTime.textContent = `${this.reservationData.time} Uhr`;
        }
    }

    validateForm() {
        const form = document.getElementById('reservation-form');
        if (!form) return false;

        const isValid = form.checkValidity();
        const submitBtn = document.getElementById('btn-submit-reservation');
        
        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
        
        return isValid;
    }

    async submitReservation(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showError('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        const form = document.getElementById('reservation-form');
        const formData = new FormData(form);
        
        // Update reservation data
        this.reservationData.guests = parseInt(formData.get('guests'));
        this.reservationData.name = formData.get('name');
        this.reservationData.email = formData.get('email');
        this.reservationData.phone = formData.get('phone');
        this.reservationData.specialRequests = formData.get('specialRequests');

        // Show loading
        const submitBtn = document.getElementById('btn-submit-reservation');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        this.showLoading();

        try {
            const response = await fetch('/.netlify/functions/create-reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.reservationData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showConfirmation(result);
            } else {
                throw new Error(result.error || 'Reservierung fehlgeschlagen');
            }
        } catch (error) {
            console.error('Error submitting reservation:', error);
            this.showError(error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        } finally {
            this.hideLoading();
        }
    }

    showConfirmation(result) {
        // Update confirmation details
        document.getElementById('confirmation-code').textContent = result.confirmationCode;
        document.getElementById('confirm-name').textContent = this.reservationData.name;
        document.getElementById('confirm-date').textContent = this.formatDateDisplay(this.reservationData.date);
        document.getElementById('confirm-time').textContent = `${this.reservationData.time} Uhr`;
        document.getElementById('confirm-guests').textContent = `${this.reservationData.guests} ${this.reservationData.guests === 1 ? 'Person' : 'Personen'}`;
        document.getElementById('confirm-email').textContent = this.reservationData.email;

        // Move to confirmation step
        this.currentStep = 4;
        this.showStep(4);
        this.updateProgressIndicator();
    }

    nextStep() {
        if (this.currentStep < 4) {
            this.currentStep++;
            this.showStep(this.currentStep);
            this.updateProgressIndicator();
            
            // Additional actions for specific steps
            if (this.currentStep === 2) {
                this.renderTimeSlots();
            } else if (this.currentStep === 3) {
                this.updateSummary();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgressIndicator();
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.reservation-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        const stepMap = {
            1: 'step-date',
            2: 'step-time',
            3: 'step-details',
            4: 'step-confirmation'
        };

        const currentStepEl = document.getElementById(stepMap[stepNumber]);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
    }

    updateProgressIndicator() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNum = index + 1;
            
            if (stepNum < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNum === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }

    showError(message) {
        const errorEl = document.getElementById('reservation-error');
        const errorMessage = document.getElementById('error-message');
        
        if (errorEl && errorMessage) {
            errorMessage.textContent = message;
            errorEl.style.display = 'flex';
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Global functions for buttons
function downloadICS() {
    const reservation = window.reservationSystem.reservationData;
    if (!reservation.date || !reservation.time) return;

    const startDate = new Date(`${reservation.date}T${reservation.time}:00`);
    const endDate = new Date(startDate.getTime() + 90 * 60000); // Add 90 minutes

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Healthy Brunch Club Wien//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${Date.now()}@healthybrunchclub.at
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Reservierung - Healthy Brunch Club Wien
DESCRIPTION:Reservierung für ${reservation.guests} Personen
LOCATION:Healthy Brunch Club Wien, Adresse hier
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'healthy-brunch-club-reservierung.ics';
    a.click();
    URL.revokeObjectURL(url);
}

function formatICSDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function startNewReservation() {
    // Reset the system
    window.reservationSystem = new ReservationSystem();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.reservationSystem = new ReservationSystem();
});
