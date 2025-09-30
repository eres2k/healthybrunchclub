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

    formatDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00');

            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('de-AT', options);
    }


        } finally {
            this.hideLoading();
        }
    }


}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.reservationSystem = new ReservationSystem();
});

// Expose helper functions globally for inline handlers
window.downloadICS = downloadICS;
window.startNewReservation = startNewReservation;

