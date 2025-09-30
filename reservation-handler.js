class ReservationSystem {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.reservationData = {};
        this.availableSlots = [];
        this.init();
    }

    init() {
        this.setupDatePicker();
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupDatePicker() {
        const dateInput = document.getElementById('reservation-date');
        if (!dateInput) return;

        // Set min date to today
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;

        // Set max date to 3 months from now
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        dateInput.max = maxDate.toISOString().split('T')[0];
    }

    setupEventListeners() {
        // Date selection
        document.getElementById('reservation-date')?.addEventListener('change', (e) => {
            this.handleDateSelection(e.target.value);
        });

        // Time slot selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('time-slot-btn')) {
                this.handleTimeSelection(e.target);
            }
        });

        // Navigation buttons
        document.getElementById('btn-next-date')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-back-time')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-next-time')?.addEventListener('click', () => this.nextStep());
        document.getElementById('btn-back-details')?.addEventListener('click', () => this.previousStep());
        document.getElementById('btn-submit-reservation')?.addEventListener('click', () => this.submitReservation());

        // Form validation
        const form = document.getElementById('reservation-form');
        if (form) {
            form.addEventListener('input', (e) => {
                this.validateField(e.target);
            });
        }

        // Phone number formatting
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.formatPhoneNumber(e.target);
            });
        }
    }

    async handleDateSelection(date) {
        if (!date) return;

        this.reservationData.date = date;
        this.showLoading();

        try {
            const response = await fetch(`/.netlify/functions/get-availability?date=${date}`);
            const availability = await response.json();

            if (!response.ok) {
                throw new Error(availability.error || 'Fehler beim Laden der Verfügbarkeit');
            }

            this.displayAvailability(availability);
        const nextDateBtn = document.getElementById('btn-next-date');
        if (nextDateBtn) {
            nextDateBtn.disabled = false;
        }

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayAvailability(availability) {
        const container = document.getElementById('time-slots-container');
        if (!container) return;

        if (!availability.available) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <p>Leider sind für diesen Tag keine Reservierungen möglich.</p>
                    <p>${availability.reason || 'Bitte wählen Sie einen anderen Tag.'}</p>
                </div>
            `;
            return;
        }

        // Group slots by hour
        const slotsByHour = {};
        availability.slots.forEach(slot => {
            const hour = slot.time.split(':')[0];
            if (!slotsByHour[hour]) {
                slotsByHour[hour] = [];
            }
            slotsByHour[hour].push(slot);
        });

        let html = '<div class="time-slots-grid">';
        
        Object.entries(slotsByHour).forEach(([hour, slots]) => {
            html += `<div class="hour-group">`;
            html += `<h4>${hour}:00 Uhr</h4>`;
            html += `<div class="slots">`;
            
            slots.forEach(slot => {
                const disabled = !slot.available ? 'disabled' : '';
                const statusClass = slot.available ? 'available' : (slot.waitlist ? 'waitlist' : 'full');
                const statusText = slot.available 
                    ? `${slot.remainingCapacity} Plätze` 
                    : (slot.waitlist ? 'Warteliste' : 'Ausgebucht');
                
                html += `
                    <button 
                        class="time-slot-btn ${statusClass}" 
                        data-time="${slot.time}"
                        data-available="${slot.available}"
                        data-capacity="${slot.remainingCapacity}"
                        ${disabled}>
                        <span class="time">${slot.time}</span>
                        <span class="status">${statusText}</span>
                    </button>
                `;
            });
            
            html += `</div></div>`;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    handleTimeSelection(button) {
        // Remove previous selection
        document.querySelectorAll('.time-slot-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Add selection
        button.classList.add('selected');
        this.reservationData.time = button.dataset.time;
        this.reservationData.availableCapacity = parseInt(button.dataset.capacity);

        // Enable next button
        const nextTimeBtn = document.getElementById('btn-next-time');
        if (nextTimeBtn) {
            nextTimeBtn.disabled = false;
        }
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.id) {
            case 'name':
                isValid = value.length >= 2;
                errorMessage = 'Bitte geben Sie Ihren Namen ein';
                break;
            
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
                break;
            
            case 'phone':
                const phoneRegex = /^(\+43|0)[1-9]\d{2,14}$/;
                const cleaned = value.replace(/[\s\-\(\)]/g, '');
                isValid = phoneRegex.test(cleaned);
                errorMessage = 'Bitte geben Sie eine gültige österreichische Telefonnummer ein';
                break;
            
            case 'guests':
                const guests = parseInt(value);
                isValid = guests >= 1 && guests <= 20;
                
                if (guests > this.reservationData.availableCapacity) {
                    isValid = false;
                    errorMessage = `Nur ${this.reservationData.availableCapacity} Plätze verfügbar`;
                } else {
                    errorMessage = 'Bitte wählen Sie 1-20 Personen';
                }
                break;
        }

        // Show/hide error
        const errorEl = field.parentElement.querySelector('.field-error');
        if (errorEl) {
            if (!isValid && value) {
                errorEl.textContent = errorMessage;
                errorEl.style.display = 'block';
                field.classList.add('error');
            } else {
                errorEl.style.display = 'none';
                field.classList.remove('error');
            }
        }

        return isValid;
    }

    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        // Austrian formatting
        if (value.startsWith('43')) {
            // +43 format
            if (value.length > 2) value = '+43 ' + value.slice(2);
            if (value.length > 6) value = value.slice(0, 6) + ' ' + value.slice(6);
            if (value.length > 10) value = value.slice(0, 10) + ' ' + value.slice(10);
        } else if (value.startsWith('0')) {
            // 0 format
            if (value.length > 4) value = value.slice(0, 4) + ' ' + value.slice(4);
            if (value.length > 8) value = value.slice(0, 8) + ' ' + value.slice(8);
        }
        
        input.value = value;
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    showStep(step) {
        // Hide all steps
        document.querySelectorAll('.reservation-step').forEach(s => {
            s.classList.remove('active');
        });

        // Show current step
        document.getElementById(`step-${step}`)?.classList.add('active');

        // Update progress
        this.updateProgress(step);
        this.currentStep = step;

        // Update step display based on data
        if (step === 3) {
            this.displaySummary();
        }
    }

    displaySummary() {
        const summary = document.getElementById('reservation-summary');
        if (!summary) return;

        const dateFormatted = this.formatDateGerman(this.reservationData.date);
        
        summary.innerHTML = `
            <div class="summary-card">
                <h3>Ihre Reservierung</h3>
                <div class="summary-details">
                    <div class="summary-item">
                        <span class="label">📅 Datum:</span>
                        <span class="value">${dateFormatted}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">🕐 Uhrzeit:</span>
                        <span class="value">${this.reservationData.time} Uhr</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">👥 Personen:</span>
                        <span class="value">${document.getElementById('guests')?.value || '?'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatDateGerman(dateStr) {
        const [year, month, day] = dateStr.split('-');
        const date = new Date(year, month - 1, day);
        
        const options = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        };
        
        return date.toLocaleDateString('de-AT', options);
    }

    async submitReservation() {
        const form = document.getElementById('reservation-form');
        if (!form) return;

        // Validate all fields
        let isValid = true;
        form.querySelectorAll('input[required], textarea[required]').forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showError('Bitte füllen Sie alle Pflichtfelder korrekt aus.');
            return;
        }

        // Collect form data
        const formData = new FormData(form);
        this.reservationData = {
            ...this.reservationData,
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            guests: parseInt(formData.get('guests')),
            specialRequests: formData.get('specialRequests')
        };

        // Show loading
        const submitBtn = document.getElementById('btn-submit-reservation');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Wird verarbeitet...';

        try {
            const response = await fetch('/.netlify/functions/create-reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.reservationData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Reservierung fehlgeschlagen');
            }

            if (result.success) {
                this.showConfirmation(result);
            }

        } catch (error) {
            this.showError(error.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Reservierung abschließen';
        }
    }

    showConfirmation(result) {
        this.showStep(4);
        
        const confirmationEl = document.getElementById('confirmation-details');
        if (!confirmationEl) return;

        const statusBadge = result.reservation.status === 'waitlist' 
            ? '<span class="badge badge-warning">Warteliste</span>'
            : '<span class="badge badge-success">Bestätigt</span>';

        confirmationEl.innerHTML = `
            <div class="confirmation-success">
                <div class="success-icon">✅</div>
                <h2>${result.message}</h2>
                ${statusBadge}
                
                <div class="confirmation-code">
                    <p>Ihr Bestätigungscode:</p>
                    <h3>${result.confirmationCode}</h3>
                </div>
                
                <div class="confirmation-details">
                    <p><strong>Name:</strong> ${result.reservation.name}</p>
                    <p><strong>Datum:</strong> ${this.formatDateGerman(result.reservation.date)}</p>
                    <p><strong>Uhrzeit:</strong> ${result.reservation.time} Uhr</p>
                    <p><strong>Personen:</strong> ${result.reservation.guests}</p>
                </div>
                
                <div class="confirmation-info">
                    <p>✉️ Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.</p>
                    <p>📱 Bitte zeigen Sie den Bestätigungscode bei Ihrer Ankunft vor.</p>
                </div>
                
                <div class="confirmation-actions">
                    <button onclick="window.print()" class="btn btn-outline">
                        🖨️ Drucken
                    </button>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Neue Reservierung
                    </button>
                </div>
            </div>
        `;
    }

    updateProgress(step) {
        const progress = document.getElementById('reservation-progress');
        if (!progress) return;

        const percentage = (step / this.totalSteps) * 100;
        progress.style.width = percentage + '%';

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            if (index < step) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (index === step - 1) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });
    }

    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }

    hideLoading() {
        document.querySelector('.loading-overlay')?.remove();
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">⚠️</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    loadInitialData() {
        // Check for URL parameters (e.g., from QR codes or links)
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedDate = urlParams.get('date');
        
        if (preselectedDate) {
            document.getElementById('reservation-date').value = preselectedDate;
            this.handleDateSelection(preselectedDate);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ReservationSystem();
});
