/**
 * UI Utilities
 * Common functions for updating user interface elements
 */

class UIUtils {
    /**
     * Update user display name in navbar and dropdown
     * @param {Object} userData - User data object
     */
    static updateUserDisplayName(userData) {
        if (!userData) {
            console.log('⚠️ No user data provided to updateUserDisplayName');
            return;
        }

        // Get user display name (try different fields)
        const displayName = userData.fullName || 
                          userData.name || 
                          (userData.firstName ? userData.firstName + ' ' + (userData.lastName || '') : '') ||
                          userData.email?.split('@')[0] || 
                          'User';

        console.log('🔄 Updating user display name to:', displayName);

        // Update navbar user name
        const userNameElement = document.getElementById('userDisplayName');
        if (userNameElement) {
            userNameElement.textContent = displayName.trim();
            console.log('✅ Updated navbar user name');
        }

        // Update dropdown user name
        const dropdownNameElement = document.getElementById('userDisplayNameDropdown');
        if (dropdownNameElement) {
            dropdownNameElement.textContent = displayName.trim();
            console.log('✅ Updated dropdown user name');
        }

        // Update any other user name elements
        const allUserNameElements = document.querySelectorAll('.user-display-name');
        allUserNameElements.forEach(element => {
            element.textContent = displayName.trim();
        });

        console.log('✅ User display name updated successfully');
    }

    /**
     * Load and display current user info
     */
    static async loadAndDisplayCurrentUser() {
        try {
            console.log('🔄 Loading current user for display...');
            
            // Check if apiClient is available
            if (typeof apiClient === 'undefined') {
                console.error('❌ apiClient is not available');
                return;
            }

            const userData = await apiClient.get('/users/profile');
            console.log('✅ Current user data loaded:', userData);
            
            UIUtils.updateUserDisplayName(userData);
            
            return userData;
        } catch (error) {
            console.error('❌ Failed to load current user:', error);
            
            // Set fallback name
            const fallbackName = 'User';
            const userNameElement = document.getElementById('userDisplayName');
            const dropdownNameElement = document.getElementById('userDisplayNameDropdown');
            
            if (userNameElement) userNameElement.textContent = fallbackName;
            if (dropdownNameElement) dropdownNameElement.textContent = fallbackName;
            
            return null;
        }
    }

    /**
     * Initialize user display when page loads
     */
    static initUserDisplay() {
        // Auto-load user display on pages with navbar
        document.addEventListener('DOMContentLoaded', () => {
            const userDisplayElement = document.getElementById('userDisplayName');
            if (userDisplayElement && authUtils?.isAuthenticated()) {
                UIUtils.loadAndDisplayCurrentUser();
            }
        });
    }
}

// Initialize user display
UIUtils.initUserDisplay();

// Global access

// Toast helper (global)
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
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
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => { toastElement.remove(); });
}
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

window.showToast = showToast;
window.UIUtils = UIUtils;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIUtils;
}
