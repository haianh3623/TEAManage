/**
 * Authentication Page JavaScript
 * Handles login and registration functionality
 */

class AuthPage {
    constructor() {
        this.currentTab = 'login';
        this.isSubmitting = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupValidation();
        this.checkAuthStatus();
    }

    /**
     * Check if user is already authenticated
     */
    checkAuthStatus() {
        if (authUtils.isAuthenticated()) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Setup event listeners for forms and tabs
     */
    setupEventListeners() {
        console.log('Setting up event listeners'); // Debug log
        
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Login form found, adding event listener');
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        } else {
            console.error('Login form not found!');
        }

        // Register form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log('Register form found, adding event listener');
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        } else {
            console.error('Register form not found!');
        }

        // Password confirmation validation
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordConfirmation());
        }

        // Real-time email validation
        const loginEmail = document.getElementById('loginEmail');
        const registerEmail = document.getElementById('registerEmail');
        
        if (loginEmail) {
            loginEmail.addEventListener('blur', () => this.validateField('loginEmail', 'email'));
        }
        
        if (registerEmail) {
            registerEmail.addEventListener('blur', () => this.validateField('registerEmail', 'email'));
        }

        // Phone number validation
        const phoneNumber = document.getElementById('phoneNumber');
        if (phoneNumber) {
            phoneNumber.addEventListener('blur', () => this.validateField('phoneNumber', 'phone'));
        }
    }

    /**
     * Setup form validation
     */
    setupValidation() {
        // Login form validation rules
        this.loginRules = {
            email: [
                { type: 'required' },
                { type: 'email' }
            ],
            password: [
                { type: 'required' }
            ]
        };

        // Register form validation rules
        this.registerRules = {
            firstName: [
                { type: 'required' },
                { type: 'name' }
            ],
            lastName: [
                { type: 'required' },
                { type: 'name' }
            ],
            email: [  // Form field name là "email", không phải "registerEmail"
                { type: 'required' },
                { type: 'email' }
            ],
            phoneNumber: [
                { type: 'required' },
                { type: 'phone', phoneType: 'vietnam' }
            ],
            dob: [
                { type: 'required' },
                { type: 'custom', validator: this.validateAge }
            ],
            password: [
                { type: 'required' },
                { type: 'password', strength: 'weak' }  // Use weak password for testing
            ],
            confirmPassword: [
                { type: 'required' },
                { type: 'passwordConfirm', passwordField: 'password' }
            ]
        };
    }

    /**
     * Validate individual field
     */
    validateField(fieldId, type) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        let result = { isValid: true, message: '' };

        switch (type) {
            case 'email':
                result = validation.email(value);
                break;
            case 'phone':
                result = validation.phone(value, 'vietnam');
                break;
            default:
                break;
        }

        this.showFieldValidation(field, result);
        return result;
    }

    /**
     * Validate age from date of birth
     */
    validateAge(dob) {
        if (!dob) return { isValid: false, message: 'Ngày sinh là bắt buộc' };
        
        const today = new Date();
        const birthDate = new Date(dob);
        const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (age < 13) {
            return { isValid: false, message: 'Bạn phải ít nhất 13 tuổi để đăng ký' };
        }
        
        if (age > 100) {
            return { isValid: false, message: 'Vui lòng kiểm tra lại ngày sinh' };
        }
        
        return { isValid: true, message: '' };
    }

    /**
     * Validate password confirmation
     */
    validatePasswordConfirmation() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        const result = validation.passwordConfirm(password, confirmPassword);
        const field = document.getElementById('confirmPassword');
        
        this.showFieldValidation(field, result);
        return result;
    }

    /**
     * Show field validation result
     */
    showFieldValidation(field, result) {
        // Remove existing error
        const existingError = field.parentNode.querySelector('.validation-error');
        if (existingError) {
            existingError.remove();
        }

        // Update field classes
        field.classList.remove('is-invalid', 'is-valid');
        
        if (result.message) {
            // Add error message
            const errorElement = document.createElement('div');
            errorElement.className = 'validation-error';
            errorElement.textContent = result.message;
            field.parentNode.appendChild(errorElement);
            field.classList.add('is-invalid');
        } else if (field.value.trim()) {
            field.classList.add('is-valid');
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return;
        
        const formData = new FormData(event.target);
        const loginData = Object.fromEntries(formData.entries());
        
        // Validate form
        const validationResult = validation.validateForm(loginData, this.loginRules);
        if (!validationResult.isValid) {
            this.showValidationErrors(validationResult.fields);
            return;
        }

        try {
            this.setSubmitting(true, 'loginBtn', 'Đang đăng nhập...');
            this.hideAlert();

            // Call login API
            const response = await api.auth.login(loginData);
            
            // Check if response contains accessToken (backend uses accessToken instead of token)
            if (response && response.accessToken) {
                // Calculate expiresIn in seconds from expiresIn timestamp
                const expiresInSeconds = response.expiresIn ? 
                    Math.floor((response.expiresIn - Date.now()) / 1000) : null;
                
                // Save authentication data
                authUtils.saveToken(
                    response.accessToken, 
                    null, // No refresh token in this response
                    expiresInSeconds
                );
                
                // Save user info if provided
                if (response.user) {
                    authUtils.saveUserInfo(response.user);
                }
                
                this.showAlert('Đăng nhập thành công! Đang chuyển hướng...', 'success');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                const errorMessage = response?.message || 'Phản hồi từ server không hợp lệ. Access token không tìm thấy.';
                this.showAlert(errorMessage, 'danger');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.', 'danger');
        } finally {
            this.setSubmitting(false, 'loginBtn', 'Đăng nhập');
        }
    }

    /**
     * Handle register form submission
     */
    async handleRegister(event) {
        console.log('Register form submitted'); // Debug log
        event.preventDefault();
        
        if (this.isSubmitting) {
            console.log('Already submitting, returning');
            return;
        }
        
        const formData = new FormData(event.target);
        const registerData = Object.fromEntries(formData.entries());
        console.log('Register data:', registerData); // Debug log
        
        // Validate form
        const validationResult = validation.validateForm(registerData, this.registerRules);
        console.log('Validation result:', validationResult); // Debug log
        
        if (!validationResult.isValid) {
            console.log('Validation failed:', validationResult.fields);
            this.showValidationErrors(validationResult.fields);
            return;
        }

        // Remove confirmPassword from data to send to server
        delete registerData.confirmPassword;

        try {
            this.setSubmitting(true, 'registerBtn', 'Đang đăng ký...');
            this.hideAlert();

            console.log('Calling register API with data:', registerData); // Debug log

            // Call register API
            const response = await api.users.register(registerData);
            
            console.log('Register API response:', response); // Debug log
            
            // Handle successful registration response
            if (response && response.id) {
                this.showAlert('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
                
                // Switch to login tab after successful registration
                setTimeout(() => {
                    this.switchTab('login');
                    // Pre-fill email in login form
                    document.getElementById('loginEmail').value = registerData.email;
                    // Clear register form
                    document.getElementById('registerForm').reset();
                }, 2000);
            } else {
                this.showAlert('Đăng ký thất bại. Phản hồi từ server không hợp lệ.', 'danger');
            }
            
        } catch (error) {
            console.error('Register error:', error);
            this.showAlert(error.message || 'Đăng ký thất bại. Vui lòng thử lại.', 'danger');
        } finally {
            this.setSubmitting(false, 'registerBtn', 'Đăng ký');
        }
    }

    /**
     * Show validation errors for form fields
     */
    showValidationErrors(fields) {
        Object.keys(fields).forEach(fieldName => {
            const field = document.getElementById(fieldName) || 
                         document.getElementById(`login${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`) ||
                         document.getElementById(`register${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
            
            if (field) {
                this.showFieldValidation(field, fields[fieldName]);
            }
        });
    }

    /**
     * Set submitting state for form
     */
    setSubmitting(isSubmitting, buttonId, text) {
        this.isSubmitting = isSubmitting;
        const button = document.getElementById(buttonId);
        const btnText = button.querySelector('.btn-text');
        
        if (isSubmitting) {
            button.disabled = true;
            btnText.innerHTML = `<span class="spinner"></span>${text}`;
        } else {
            button.disabled = false;
            btnText.textContent = text;
        }
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    /**
     * Hide alert message
     */
    hideAlert() {
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.innerHTML = '';
    }

    /**
     * Switch between login and register tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the correct tab button
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            if ((tabName === 'login' && btn.textContent.includes('Đăng nhập')) ||
                (tabName === 'register' && btn.textContent.includes('Đăng ký'))) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Clear any alerts and validation errors
        this.hideAlert();
        this.clearValidationErrors();
    }

    /**
     * Clear all validation errors
     */
    clearValidationErrors() {
        document.querySelectorAll('.validation-error').forEach(error => {
            error.remove();
        });
        
        document.querySelectorAll('.form-control').forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });
    }
}

// Global function for tab switching (called from HTML)
function switchTab(tabName) {
    if (window.authPage) {
        window.authPage.switchTab(tabName);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authPage = new AuthPage();
});
