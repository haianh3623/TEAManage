/**
 * Profile Page JavaScript - Simplified version for existing backend API
 */

console.log('📄 profile.js script loaded at:', new Date().toISOString());

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.originalUserData = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Profile Manager');
        
        // Check authentication
        if (!authUtils.isAuthenticated()) {
            console.log('❌ Not authenticated, redirecting to auth page');
            window.location.href = 'auth.html';
            return;
        }

        // Load user data
        await this.loadUserProfile();
        this.setupEventListeners();
        
        console.log('✅ Profile Manager initialized successfully');
    }

    async loadUserProfile() {
        try {
            console.log('🔄 Loading user profile...');
            
            // Try to get current user info
            const user = authUtils.getUserInfo();
            console.log('👤 Current user from auth:', user);
            
            if (!user || !user.id) {
                // If no user info, try to get from token payload
                const tokenPayload = authUtils.decodeToken();
                console.log('🎫 Token payload:', tokenPayload);
                
                if (!tokenPayload || !tokenPayload.id) {
                    throw new Error('No user ID available - please login again');
                }
                
                // Use token payload data
                this.currentUser = {
                    id: tokenPayload.id,
                    email: tokenPayload.email || tokenPayload.sub,
                    firstName: tokenPayload.firstName || '',
                    lastName: tokenPayload.lastName || ''
                };
                
                console.log('📋 Using token payload as current user:', this.currentUser);
            } else {
                // Use existing backend endpoint to get full user data
                console.log(`🔄 Fetching full user data for ID: ${user.id}`);
                this.currentUser = await apiClient.get(`/users/${user.id}`);
                console.log('✅ Full user profile loaded from API:', this.currentUser);
            }
            
            // Store original data for reset functionality
            this.originalUserData = { ...this.currentUser };
            
            // Update UI with user data
            this.updateProfileHeader();
            this.populateBasicInfoForm();
            
        } catch (error) {
            console.error('❌ Failed to load user profile:', error);
            
            // Show more specific error messages
            if (error.message.includes('login again')) {
                this.showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 2000);
            } else {
                this.showError('Không thể tải thông tin hồ sơ: ' + error.message);
            }
        }
    }

    updateProfileHeader() {
        try {
            console.log('🎨 Updating profile header with user data:', this.currentUser);
            
            if (!this.currentUser) {
                console.log('⚠️ No current user data available');
                return;
            }

            // Update compact avatar
            const avatarElement = document.getElementById('avatarText');
            const avatarContainer = document.querySelector('.profile-avatar-compact');
            
            if (avatarElement && avatarContainer) {
                const initials = this.getInitials();
                console.log('🎭 Setting avatar initials:', initials);
                avatarElement.textContent = initials;
                avatarContainer.style.background = this.getColorFromName();
            } else {
                console.log('⚠️ Avatar elements not found in DOM');
            }

            // Update user name
            const nameElement = document.getElementById('profileName');
            if (nameElement) {
                const fullName = `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim();
                const displayName = fullName || this.currentUser.email || 'Người dùng';
                console.log('👤 Setting profile name:', displayName);
                nameElement.textContent = displayName;
            } else {
                console.log('⚠️ Profile name element not found');
            }

            // Update email
            const emailElement = document.getElementById('profileEmail');
            if (emailElement) {
                const email = this.currentUser.email || '';
                console.log('📧 Setting profile email:', email);
                emailElement.textContent = email;
            } else {
                console.log('⚠️ Profile email element not found');
            }

            // Update navbar user display
            const navUserName = document.getElementById('userDisplayName');
            const navUserNameDropdown = document.getElementById('userDisplayNameDropdown');
            
            const navDisplayName = `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() 
                                 || this.currentUser.email?.split('@')[0] || 'User';
            
            console.log('🧭 Setting navbar display name:', navDisplayName);
            
            if (navUserName) navUserName.textContent = navDisplayName;
            if (navUserNameDropdown) navUserNameDropdown.textContent = navDisplayName;

            console.log('✅ Profile header updated successfully');

        } catch (error) {
            console.error('❌ Error updating profile header:', error);
        }
    }

    getInitials() {
        if (!this.currentUser) return '?';
        
        const firstName = this.currentUser.firstName || '';
        const lastName = this.currentUser.lastName || '';
        
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        } else if (firstName) {
            return firstName.charAt(0).toUpperCase();
        } else if (this.currentUser.email) {
            return this.currentUser.email.charAt(0).toUpperCase();
        }
        
        return '?';
    }

    getColorFromName() {
        if (!this.currentUser || !this.currentUser.firstName) return '#6c757d';
        
        const colors = [
            '#007bff', '#6c757d', '#28a745', '#17a2b8',
            '#ffc107', '#fd7e14', '#e83e8c', '#6610f2'
        ];
        
        let hash = 0;
        const name = this.currentUser.firstName;
        for (let i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash;
        }
        
        return colors[Math.abs(hash) % colors.length];
    }

    populateBasicInfoForm() {
        try {
            console.log('📝 Populating basic info form with user data:', this.currentUser);
            
            if (!this.currentUser) {
                console.log('⚠️ No current user data to populate form');
                return;
            }

            const fields = {
                'firstName': this.currentUser.firstName || '',
                'lastName': this.currentUser.lastName || '',
                'email': this.currentUser.email || '',
                'phoneNumber': this.currentUser.phoneNumber || this.currentUser.phone || '',
                'dob': this.currentUser.dob || this.currentUser.dateOfBirth || ''
            };

            console.log('📋 Fields to populate:', fields);

            Object.entries(fields).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    // Special handling for date fields
                    if (fieldId === 'dob' && value) {
                        // Convert date to YYYY-MM-DD format for input[type="date"]
                        let dateValue = value;
                        if (value.includes('T')) {
                            // If ISO string, extract date part
                            dateValue = value.split('T')[0];
                        } else if (value.includes('/')) {
                            // If DD/MM/YYYY format, convert to YYYY-MM-DD
                            const parts = value.split('/');
                            if (parts.length === 3) {
                                dateValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                        }
                        console.log(`📅 Setting date ${fieldId} = "${dateValue}" (original: "${value}")`);
                        element.value = dateValue;
                    } else {
                        console.log(`✏️ Setting ${fieldId} = "${value}"`);
                        element.value = value;
                    }
                } else {
                    console.log(`⚠️ Form element not found: ${fieldId}`);
                }
            });

            console.log('✅ Basic info form populated successfully');
        } catch (error) {
            console.error('❌ Error populating form:', error);
        }
    }

    setupEventListeners() {
        try {
            // Basic info form submission
            const basicForm = document.getElementById('basicInfoForm');
            if (basicForm) {
                basicForm.addEventListener('submit', (e) => this.handleBasicInfoSubmit(e));
            }

            // Password form submission
            const passwordForm = document.getElementById('passwordForm');
            if (passwordForm) {
                passwordForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
            }

            // Phone number validation
            const phoneInput = document.getElementById('phoneNumber');
            if (phoneInput) {
                phoneInput.addEventListener('input', this.validatePhoneInput.bind(this));
            }

            // Password confirmation validation
            const confirmPasswordInput = document.getElementById('confirmPassword');
            if (confirmPasswordInput) {
                confirmPasswordInput.addEventListener('input', this.validatePasswordConfirmation.bind(this));
            }

            console.log('✅ Event listeners set up');
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }

    async handleBasicInfoSubmit(event) {
        event.preventDefault();
        
        try {
            console.log('🔄 Submitting basic info form...');
            
            if (!this.validateBasicInfoForm()) {
                return;
            }

            const formData = new FormData(event.target);
            const userData = {
                firstName: formData.get('firstName').trim(),
                lastName: formData.get('lastName').trim(),
                email: formData.get('email').trim(),
                phoneNumber: formData.get('phoneNumber')?.trim() || null,
                dob: formData.get('dob') || null
            };

            console.log('📤 Sending user data:', userData);

            // Use existing backend endpoint
            const response = await apiClient.put(`/users/${this.currentUser.id}`, userData);
            
            console.log('✅ User profile updated successfully:', response);
            
            // Update local data
            this.currentUser = { ...this.currentUser, ...userData };
            this.originalUserData = { ...this.currentUser };
            
            // Update UI
            this.updateProfileHeader();
            
            this.showSuccess('Cập nhật thông tin thành công!');

        } catch (error) {
            console.error('❌ Failed to update basic info:', error);
            this.showError('Lỗi khi cập nhật thông tin: ' + (error.message || 'Vui lòng thử lại'));
        }
    }

    async handlePasswordSubmit(event) {
        event.preventDefault();
        
        try {
            console.log('🔄 Submitting password form...');
            
            if (!this.validatePasswordForm()) {
                return;
            }

            const formData = new FormData(event.target);
            const passwordData = {
                oldPassword: formData.get('currentPassword'),
                newPassword: formData.get('newPassword')
            };

            console.log('📤 Changing password...');

            // Use existing backend endpoint
            await apiClient.put(`/users/${this.currentUser.id}/password`, passwordData);
            
            console.log('✅ Password changed successfully');
            
            // Clear password form
            event.target.reset();
            this.clearFormErrors('passwordForm');
            
            this.showSuccess('Đổi mật khẩu thành công!');

        } catch (error) {
            console.error('❌ Failed to change password:', error);
            this.showError('Lỗi khi đổi mật khẩu: ' + (error.message || 'Vui lòng thử lại'));
        }
    }

    validateBasicInfoForm() {
        let isValid = true;
        this.clearFormErrors('basicInfoForm');

        const requiredFields = [
            { id: 'firstName', message: 'Vui lòng nhập họ' },
            { id: 'lastName', message: 'Vui lòng nhập tên' }
        ];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                this.showFieldError(element, field.message);
                isValid = false;
            }
        });

        const phoneElement = document.getElementById('phoneNumber');
        if (phoneElement && phoneElement.value && !this.isValidPhoneNumber(phoneElement.value)) {
            this.showFieldError(phoneElement, 'Số điện thoại không hợp lệ');
            isValid = false;
        }

        return isValid;
    }

    validatePasswordForm() {
        let isValid = true;
        this.clearFormErrors('passwordForm');

        const requiredFields = [
            { id: 'currentPassword', message: 'Vui lòng nhập mật khẩu hiện tại' },
            { id: 'newPassword', message: 'Vui lòng nhập mật khẩu mới' },
            { id: 'confirmPassword', message: 'Vui lòng xác nhận mật khẩu mới' }
        ];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                this.showFieldError(element, field.message);
                isValid = false;
            }
        });

        const newPasswordElement = document.getElementById('newPassword');
        if (newPasswordElement && newPasswordElement.value && newPasswordElement.value.length < 6) {
            this.showFieldError(newPasswordElement, 'Mật khẩu mới phải có ít nhất 6 ký tự');
            isValid = false;
        }

        const confirmPasswordElement = document.getElementById('confirmPassword');
        if (newPasswordElement && confirmPasswordElement && 
            newPasswordElement.value !== confirmPasswordElement.value) {
            this.showFieldError(confirmPasswordElement, 'Xác nhận mật khẩu không khớp');
            isValid = false;
        }

        return isValid;
    }

    validatePhoneInput(event) {
        const element = event.target;
        if (element.value && !this.isValidPhoneNumber(element.value)) {
            this.showFieldError(element, 'Số điện thoại không hợp lệ');
        } else {
            this.clearFieldError(element);
        }
    }

    validatePasswordConfirmation(event) {
        const confirmElement = event.target;
        const newPasswordElement = document.getElementById('newPassword');
        
        if (confirmElement.value && newPasswordElement && 
            confirmElement.value !== newPasswordElement.value) {
            this.showFieldError(confirmElement, 'Xác nhận mật khẩu không khớp');
        } else {
            this.clearFieldError(confirmElement);
        }
    }

    isValidPhoneNumber(phone) {
        const phoneRegex = /^[0-9]{10,11}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    showFieldError(element, message) {
        if (!element) return;
        element.classList.add('is-invalid');
        let errorDiv = element.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.textContent = message;
        }
    }

    clearFieldError(element) {
        if (!element) return;
        element.classList.remove('is-invalid');
    }

    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        const invalidElements = form.querySelectorAll('.is-invalid');
        invalidElements.forEach(element => element.classList.remove('is-invalid'));
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Remove existing notifications first
        const existingNotifications = document.querySelectorAll('.alert.position-fixed');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        const alertType = type === 'error' ? 'danger' : type;
        notification.className = `alert alert-${alertType} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 80px; 
            right: 20px; 
            z-index: 1050; 
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: none;
        `;
        
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <strong class="me-2">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</strong>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                try {
                    const alert = bootstrap.Alert.getOrCreateInstance(notification);
                    alert.close();
                } catch (e) {
                    notification.remove();
                }
            }
        }, 4000);
    }
}

// Reset form function
function resetForm() {
    if (window.profileManager && profileManager.originalUserData) {
        profileManager.populateBasicInfoForm();
        profileManager.clearFormErrors('basicInfoForm');
        profileManager.showNotification('Đã khôi phục dữ liệu gốc', 'info');
        console.log('🔄 Form reset to original data');
    }
}

// Global functions for navbar integration
function viewProfile() {
    window.location.href = 'profile.html';
}

function editProfile() {
    window.location.href = 'profile.html';
}

function logout() {
    if (typeof authUtils !== 'undefined' && authUtils.logout) {
        authUtils.logout();
    } else {
        localStorage.clear();
        window.location.href = 'auth.html';
    }
}

function markAllAsRead() {
    // Implementation for marking notifications as read
    console.log('Mark all notifications as read');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Profile Manager...');
    window.profileManager = new ProfileManager();
});

// Export for debugging
window.ProfileManager = ProfileManager;
