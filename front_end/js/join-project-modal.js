/**
 * Join Project Modal JavaScript
 * Common modal for joining projects via invite code
 */

class JoinProjectModal {
    constructor() {
        this.modal = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        // Only initialize once
        if (this.isInitialized) return;
        
        this.createModalHTML();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    createModalHTML() {
        // Check if modal already exists
        if (document.getElementById('joinProjectModal')) return;

        const modalHTML = `
            <!-- Join Project Modal -->
            <div class="modal fade" id="joinProjectModal" tabindex="-1" aria-labelledby="joinProjectModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="joinProjectModalLabel">
                                <i class="bi bi-person-plus me-2"></i>Tham gia dự án
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="joinProjectForm">
                                <div class="mb-3">
                                    <label for="inviteCodeInput" class="form-label">Mã mời dự án</label>
                                    <input type="text" 
                                           class="form-control" 
                                           id="inviteCodeInput" 
                                           placeholder="Nhập mã mời dự án"
                                           required
                                           autocomplete="off">
                                    <div class="form-text">Nhập mã mời mà bạn nhận được từ quản lý dự án</div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-2"></i>Hủy
                            </button>
                            <button type="button" class="btn btn-primary" id="submitJoinBtn">
                                <i class="bi bi-person-plus me-2"></i>Tham gia
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Initialize Bootstrap modal
        this.modal = new bootstrap.Modal(document.getElementById('joinProjectModal'));
    }

    setupEventListeners() {
        const form = document.getElementById('joinProjectForm');
        const submitBtn = document.getElementById('submitJoinBtn');
        const inviteInput = document.getElementById('inviteCodeInput');

        if (form && submitBtn) {
            // Handle form submission
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitJoinProject();
            });

            // Handle submit button click
            submitBtn.addEventListener('click', () => {
                this.submitJoinProject();
            });

            // Handle Enter key in input
            if (inviteInput) {
                inviteInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.submitJoinProject();
                    }
                });

                // Clear input when modal is shown
                document.getElementById('joinProjectModal').addEventListener('shown.bs.modal', () => {
                    inviteInput.value = '';
                    inviteInput.focus();
                });
            }
        }
    }

    show() {
        this.init(); // Ensure modal is initialized
        if (this.modal) {
            this.modal.show();
        }
    }

    hide() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    async submitJoinProject() {
        const inviteCodeInput = document.getElementById('inviteCodeInput');
        const submitBtn = document.getElementById('submitJoinBtn');
        
        if (!inviteCodeInput || !submitBtn) {
            console.error('Form elements not found');
            return;
        }

        const inviteCode = inviteCodeInput.value.trim();
        
        if (!inviteCode) {
            this.showToast('Vui lòng nhập mã mời', 'error');
            inviteCodeInput.focus();
            return;
        }

        try {
            // Show loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Đang tham gia...';

            console.log('🔄 Joining project with code:', inviteCode);

            // Call API to join project
            const response = await apiClient.post(`/invites/join?code=${encodeURIComponent(inviteCode)}`);
            
            console.log('✅ Successfully joined project:', response);

            // Show success message
            this.showToast('Tham gia dự án thành công!', 'success');

            // Hide modal
            this.hide();

            // Redirect to project details after a short delay
            setTimeout(() => {
                window.location.href = `project-details.html?id=${response.id}`;
            }, 1000);

        } catch (error) {
            console.error('❌ Failed to join project:', error);
            
            let errorMessage = 'Không thể tham gia dự án. Vui lòng thử lại.';
            
            if (error.status === 404) {
                errorMessage = 'Mã mời không tồn tại hoặc đã hết hạn.';
            } else if (error.status === 400) {
                errorMessage = 'Mã mời không hợp lệ.';
            } else if (error.status === 409) {
                errorMessage = 'Bạn đã là thành viên của dự án này.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showToast(errorMessage, 'error');
            
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Tham gia';
            inviteCodeInput.focus();
        }
    }

    showToast(message, type = 'info') {
        // Use existing toast function if available
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }

        // Fallback toast implementation
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 3000
        });
        
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }
}

// Global instance
let joinProjectModal;

// Global function to show join project modal
function joinProject() {
    if (!joinProjectModal) {
        joinProjectModal = new JoinProjectModal();
    }
    joinProjectModal.show();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!joinProjectModal) {
        joinProjectModal = new JoinProjectModal();
    }
});

// Make it available globally
window.joinProject = joinProject;
window.JoinProjectModal = JoinProjectModal;
