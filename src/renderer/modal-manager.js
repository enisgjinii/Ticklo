// Modal Manager for Modular Components
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.modalContainer = null;
    }

    // Initialize modal container
    init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modalContainer')) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modalContainer';
            this.modalContainer.className = 'modal-container';
            document.body.appendChild(this.modalContainer);
        } else {
            this.modalContainer = document.getElementById('modalContainer');
        }

        console.log('✓ Modal manager initialized');
    }

    // Register a modal
    registerModal(modalId, modalHTML) {
        this.modals.set(modalId, modalHTML);
        console.log(`✓ Modal '${modalId}' registered`);
    }

    // Show a modal
    showModal(modalId, options = {}) {
        try {
            // Check if modal is already registered
            if (!this.modals.has(modalId)) {
                console.error(`Modal '${modalId}' not found`);
                return false;
            }

            // Remove any existing modal
            this.hideAllModals();

            // Get modal HTML
            const modalHTML = this.modals.get(modalId);
            
            // Replace template variables if provided
            let processedHTML = modalHTML;
            if (options.variables) {
                processedHTML = this.replaceVariables(modalHTML, options.variables);
            }

            // Add modal to container
            this.modalContainer.innerHTML = processedHTML;

            // Get the modal element
            const modalElement = this.modalContainer.querySelector('.modal');
            if (!modalElement) {
                console.error(`Modal element not found in '${modalId}'`);
                return false;
            }

            // Initialize Bootstrap modal
            const modal = new bootstrap.Modal(modalElement, {
                backdrop: options.backdrop !== false ? true : false,
                keyboard: options.keyboard !== false ? true : false,
                focus: options.focus !== false ? true : false
            });

            // Store reference
            this.activeModal = {
                id: modalId,
                element: modalElement,
                bootstrapModal: modal
            };

            // Show the modal
            modal.show();

            // Set up event listeners
            this.setupModalEventListeners(modalElement, modalId);

            console.log(`✓ Modal '${modalId}' shown`);
            return true;

        } catch (error) {
            console.error(`✗ Failed to show modal '${modalId}':`, error);
            return false;
        }
    }

    // Hide a specific modal
    hideModal(modalId) {
        if (this.activeModal && this.activeModal.id === modalId) {
            this.activeModal.bootstrapModal.hide();
            this.activeModal = null;
            console.log(`✓ Modal '${modalId}' hidden`);
        }
    }

    // Hide all modals
    hideAllModals() {
        if (this.activeModal) {
            this.activeModal.bootstrapModal.hide();
            this.activeModal = null;
        }
        if (this.modalContainer) {
            this.modalContainer.innerHTML = '';
        }
    }

    // Set up event listeners for modal
    setupModalEventListeners(modalElement, modalId) {
        // Handle form submissions
        const form = modalElement.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleModalFormSubmit(e, modalId);
            });
        }

        // Handle close button clicks
        const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideModal(modalId);
            });
        });

        // Handle modal hidden event
        modalElement.addEventListener('hidden.bs.modal', () => {
            this.activeModal = null;
            console.log(`✓ Modal '${modalId}' closed`);
        });

        // Set default values for add activity modal
        if (modalId === 'addActivityModal') {
            this.setupAddActivityModal(modalElement);
        }
    }

    // Handle form submission in modals
    handleModalFormSubmit(event, modalId) {
        event.preventDefault();
        
        switch (modalId) {
            case 'addActivityModal':
                this.handleAddActivityForm(event);
                break;
            default:
                console.log(`Form submitted in modal '${modalId}'`);
        }
    }

    // Set up add activity modal with default values
    setupAddActivityModal(modalElement) {
        const form = modalElement.querySelector('#addActivityForm');
        if (!form) return;

        const now = new Date();
        const startTime = new Date(now - 30 * 60 * 1000); // 30 minutes ago

        const startTimeInput = form.querySelector('[name="startTime"]');
        const durationInput = form.querySelector('[name="duration"]');

        if (startTimeInput) {
            startTimeInput.value = startTime.toISOString().slice(0, 16);
        }
        if (durationInput) {
            durationInput.value = 30;
        }
    }

    // Handle add activity form submission
    async handleAddActivityForm(event) {
        try {
            const formData = new FormData(event.target);
            const startTime = new Date(formData.get('startTime'));
            const duration = parseInt(formData.get('duration')) * 60 * 1000;

            const activity = {
                id: this.generateId(),
                app: formData.get('app'),
                title: formData.get('title'),
                category: formData.get('category'),
                startTime: startTime.toISOString(),
                endTime: new Date(startTime.getTime() + duration).toISOString(),
                duration: duration,
                manual: true
            };

            // Add to state (assuming state is available globally)
            if (window.state && window.state.activities) {
                window.state.activities.push(activity);
                
                // Save activities
                if (typeof window.saveActivities === 'function') {
                    await window.saveActivities();
                }
                
                // Update UI
                if (typeof window.updateUI === 'function') {
                    window.updateUI();
                }
            }

            // Close modal
            this.hideModal('addActivityModal');
            
            // Reset form
            event.target.reset();

            // Show success message
            if (typeof window.showToast === 'function') {
                window.showToast('Activity added successfully', 'success');
            }

            console.log('✓ Activity added via modal:', activity);

        } catch (error) {
            console.error('✗ Failed to add activity:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Error adding activity', 'error');
            }
        }
    }

    // Replace template variables
    replaceVariables(html, variables) {
        let processedHTML = html;
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processedHTML = processedHTML.replace(placeholder, value);
        });
        return processedHTML;
    }

    // Generate ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get modal status
    getStatus() {
        return {
            registeredModals: Array.from(this.modals.keys()),
            activeModal: this.activeModal ? this.activeModal.id : null,
            totalModals: this.modals.size
        };
    }

    // Clear all modals
    clear() {
        this.modals.clear();
        this.hideAllModals();
        console.log('✓ All modals cleared');
    }
}

// Create global instance
const ModalManager = new ModalManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ModalManager.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}

// Make available globally
window.ModalManager = ModalManager; 