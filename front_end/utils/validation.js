/**
 * Validation Utilities
 * Handles validation for email, phone, password and other data fields
 */

class ValidationUtils {
    constructor() {
        // Regular expressions for validation
        this.patterns = {
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            phone: {
                vietnam: /^(\+84|84|0)(3[2-9]|5[689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/,
                international: /^\+?[1-9]\d{1,14}$/
            },
            password: {
                weak: /^.{3,}$/, // At least 3 characters (simplified for testing)
                medium: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, // 8+ chars, upper, lower, number
                strong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/ // 8+ chars, upper, lower, number, special
            },
            username: /^[a-zA-Z0-9_]{3,20}$/,
            name: /^[a-zA-ZÀ-ỹ\s]{2,50}$/,
            url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            zipCode: /^\d{5}(-\d{4})?$/,
            creditCard: /^\d{13,19}$/,
            ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        };

        // Error messages
        this.messages = {
            required: 'Trường này là bắt buộc',
            email: 'Email không hợp lệ',
            phone: 'Số điện thoại không hợp lệ',
            password: {
                weak: 'Mật khẩu phải có ít nhất 3 ký tự',
                medium: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số',
                strong: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt'
            },
            passwordMismatch: 'Mật khẩu xác nhận không khớp',
            username: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (3-20 ký tự)',
            name: 'Tên chỉ được chứa chữ cái và khoảng trắng (2-50 ký tự)',
            minLength: 'Tối thiểu {min} ký tự',
            maxLength: 'Tối đa {max} ký tự',
            min: 'Giá trị tối thiểu là {min}',
            max: 'Giá trị tối đa là {max}',
            url: 'URL không hợp lệ',
            zipCode: 'Mã bưu điện không hợp lệ',
            creditCard: 'Số thẻ tín dụng không hợp lệ',
            ipAddress: 'Địa chỉ IP không hợp lệ',
            fileSize: 'Kích thước file vượt quá giới hạn cho phép',
            fileType: 'Loại file không được hỗ trợ'
        };
    }

    /**
     * Check if value is empty
     * @param {any} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Validate required field
     * @param {any} value - Value to validate
     * @returns {object} Validation result
     */
    required(value) {
        const isValid = !this.isEmpty(value);
        return {
            isValid,
            message: isValid ? '' : this.messages.required
        };
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @param {boolean} isRequired - Whether field is required
     * @returns {object} Validation result
     */
    email(email, isRequired = true) {
        if (!isRequired && this.isEmpty(email)) {
            return { isValid: true, message: '' };
        }

        if (isRequired && this.isEmpty(email)) {
            return { isValid: false, message: this.messages.required };
        }

        const isValid = this.patterns.email.test(email.trim());
        return {
            isValid,
            message: isValid ? '' : this.messages.email
        };
    }

    /**
     * Validate phone number
     * @param {string} phone - Phone number to validate
     * @param {string} type - Type of validation ('vietnam' or 'international')
     * @param {boolean} isRequired - Whether field is required
     * @returns {object} Validation result
     */
    phone(phone, type = 'vietnam', isRequired = true) {
        if (!isRequired && this.isEmpty(phone)) {
            return { isValid: true, message: '' };
        }

        if (isRequired && this.isEmpty(phone)) {
            return { isValid: false, message: this.messages.required };
        }

        const pattern = this.patterns.phone[type] || this.patterns.phone.vietnam;
        const isValid = pattern.test(phone.trim());
        return {
            isValid,
            message: isValid ? '' : this.messages.phone
        };
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @param {string} strength - Required strength ('weak', 'medium', 'strong')
     * @returns {object} Validation result with strength score
     */
    password(password, strength = 'medium') {
        if (this.isEmpty(password)) {
            return { 
                isValid: false, 
                message: this.messages.required,
                strength: 'none',
                score: 0
            };
        }

        const patterns = this.patterns.password;
        let score = 0;
        let currentStrength = 'weak';

        // Check different criteria
        if (password.length >= 6) score += 1;
        if (password.length >= 8) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[@$!%*?&]/.test(password)) score += 1;

        // Determine strength
        if (patterns.strong.test(password)) {
            currentStrength = 'strong';
        } else if (patterns.medium.test(password)) {
            currentStrength = 'medium';
        } else if (patterns.weak.test(password)) {
            currentStrength = 'weak';
        } else {
            currentStrength = 'none';
        }

        const strengthOrder = ['none', 'weak', 'medium', 'strong'];
        const requiredStrengthIndex = strengthOrder.indexOf(strength);
        const currentStrengthIndex = strengthOrder.indexOf(currentStrength);
        
        const isValid = currentStrengthIndex >= requiredStrengthIndex;

        return {
            isValid,
            message: isValid ? '' : this.messages.password[strength],
            strength: currentStrength,
            score: Math.min(score, 6)
        };
    }

    /**
     * Validate password confirmation
     * @param {string} password - Original password
     * @param {string} confirmPassword - Confirmation password
     * @returns {object} Validation result
     */
    passwordConfirm(password, confirmPassword) {
        if (this.isEmpty(confirmPassword)) {
            return { isValid: false, message: this.messages.required };
        }

        const isValid = password === confirmPassword;
        return {
            isValid,
            message: isValid ? '' : this.messages.passwordMismatch
        };
    }

    /**
     * Validate username
     * @param {string} username - Username to validate
     * @returns {object} Validation result
     */
    username(username) {
        if (this.isEmpty(username)) {
            return { isValid: false, message: this.messages.required };
        }

        const isValid = this.patterns.username.test(username.trim());
        return {
            isValid,
            message: isValid ? '' : this.messages.username
        };
    }

    /**
     * Validate name (first name, last name)
     * @param {string} name - Name to validate
     * @param {boolean} isRequired - Whether field is required
     * @returns {object} Validation result
     */
    name(name, isRequired = true) {
        if (!isRequired && this.isEmpty(name)) {
            return { isValid: true, message: '' };
        }

        if (isRequired && this.isEmpty(name)) {
            return { isValid: false, message: this.messages.required };
        }

        const isValid = this.patterns.name.test(name.trim());
        return {
            isValid,
            message: isValid ? '' : this.messages.name
        };
    }

    /**
     * Validate string length
     * @param {string} value - String to validate
     * @param {number} min - Minimum length
     * @param {number} max - Maximum length
     * @returns {object} Validation result
     */
    length(value, min = 0, max = Infinity) {
        if (this.isEmpty(value)) {
            return { isValid: min === 0, message: min > 0 ? this.messages.required : '' };
        }

        const length = value.trim().length;
        
        if (length < min) {
            return {
                isValid: false,
                message: this.messages.minLength.replace('{min}', min)
            };
        }

        if (length > max) {
            return {
                isValid: false,
                message: this.messages.maxLength.replace('{max}', max)
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate numeric range
     * @param {number} value - Number to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {object} Validation result
     */
    range(value, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        
        if (isNaN(num)) {
            return { isValid: false, message: 'Giá trị phải là số' };
        }

        if (num < min) {
            return {
                isValid: false,
                message: this.messages.min.replace('{min}', min)
            };
        }

        if (num > max) {
            return {
                isValid: false,
                message: this.messages.max.replace('{max}', max)
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @param {boolean} isRequired - Whether field is required
     * @returns {object} Validation result
     */
    url(url, isRequired = true) {
        if (!isRequired && this.isEmpty(url)) {
            return { isValid: true, message: '' };
        }

        if (isRequired && this.isEmpty(url)) {
            return { isValid: false, message: this.messages.required };
        }

        const isValid = this.patterns.url.test(url.trim());
        return {
            isValid,
            message: isValid ? '' : this.messages.url
        };
    }

    /**
     * Validate file upload
     * @param {File} file - File to validate
     * @param {object} options - Validation options
     * @returns {object} Validation result
     */
    file(file, options = {}) {
        const {
            maxSize = 5 * 1024 * 1024, // 5MB default
            allowedTypes = [],
            isRequired = true
        } = options;

        if (!file) {
            return { 
                isValid: !isRequired, 
                message: isRequired ? this.messages.required : '' 
            };
        }

        // Check file size
        if (file.size > maxSize) {
            return {
                isValid: false,
                message: this.messages.fileSize
            };
        }

        // Check file type
        if (allowedTypes.length > 0) {
            const fileType = file.type;
            const fileName = file.name.toLowerCase();
            
            const isTypeAllowed = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    return fileName.endsWith(type);
                }
                return fileType.includes(type);
            });

            if (!isTypeAllowed) {
                return {
                    isValid: false,
                    message: this.messages.fileType
                };
            }
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate date
     * @param {string} date - Date string to validate
     * @param {string} format - Expected date format
     * @returns {object} Validation result
     */
    date(date, format = 'yyyy-mm-dd') {
        if (this.isEmpty(date)) {
            return { isValid: false, message: this.messages.required };
        }

        const parsedDate = new Date(date);
        const isValid = !isNaN(parsedDate.getTime());
        
        return {
            isValid,
            message: isValid ? '' : 'Ngày không hợp lệ'
        };
    }

    /**
     * Validate age
     * @param {string} birthDate - Birth date
     * @param {number} minAge - Minimum age
     * @param {number} maxAge - Maximum age
     * @returns {object} Validation result
     */
    age(birthDate, minAge = 0, maxAge = 150) {
        if (this.isEmpty(birthDate)) {
            return { isValid: false, message: this.messages.required };
        }

        const birth = new Date(birthDate);
        const today = new Date();
        const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));

        if (age < minAge || age > maxAge) {
            return {
                isValid: false,
                message: `Tuổi phải từ ${minAge} đến ${maxAge}`
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate form with multiple fields
     * @param {object} formData - Form data object
     * @param {object} rules - Validation rules
     * @returns {object} Validation result for all fields
     */
    validateForm(formData, rules) {
        const results = {};
        let isFormValid = true;

        Object.keys(rules).forEach(field => {
            const value = formData[field];
            const fieldRules = rules[field];
            let fieldResult = { isValid: true, message: '' };

            // Apply each rule for the field
            for (const rule of fieldRules) {
                const { type, ...options } = rule;
                
                switch (type) {
                    case 'required':
                        fieldResult = this.required(value);
                        break;
                    case 'email':
                        fieldResult = this.email(value, options.isRequired);
                        break;
                    case 'phone':
                        fieldResult = this.phone(value, options.type, options.isRequired);
                        break;
                    case 'password':
                        fieldResult = this.password(value, options.strength);
                        break;
                    case 'passwordConfirm':
                        fieldResult = this.passwordConfirm(formData[options.passwordField], value);
                        break;
                    case 'username':
                        fieldResult = this.username(value);
                        break;
                    case 'name':
                        fieldResult = this.name(value, options.isRequired);
                        break;
                    case 'length':
                        fieldResult = this.length(value, options.min, options.max);
                        break;
                    case 'range':
                        fieldResult = this.range(value, options.min, options.max);
                        break;
                    case 'url':
                        fieldResult = this.url(value, options.isRequired);
                        break;
                    case 'file':
                        fieldResult = this.file(value, options);
                        break;
                    case 'custom':
                        fieldResult = options.validator(value, formData);
                        break;
                }

                // If validation fails, stop checking other rules for this field
                if (!fieldResult.isValid) {
                    break;
                }
            }

            results[field] = fieldResult;
            if (!fieldResult.isValid) {
                isFormValid = false;
            }
        });

        return {
            isValid: isFormValid,
            fields: results,
            errors: Object.keys(results)
                .filter(field => !results[field].isValid)
                .reduce((acc, field) => {
                    acc[field] = results[field].message;
                    return acc;
                }, {})
        };
    }

    /**
     * Real-time validation for form fields
     * @param {HTMLElement} form - Form element
     * @param {object} rules - Validation rules
     */
    setupRealTimeValidation(form, rules) {
        Object.keys(rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const showError = (message) => {
                // Remove existing error
                const existingError = field.parentNode.querySelector('.validation-error');
                if (existingError) {
                    existingError.remove();
                }

                if (message) {
                    // Add error message
                    const errorElement = document.createElement('div');
                    errorElement.className = 'validation-error';
                    errorElement.textContent = message;
                    errorElement.style.color = 'red';
                    errorElement.style.fontSize = '0.875rem';
                    errorElement.style.marginTop = '0.25rem';
                    field.parentNode.appendChild(errorElement);
                    
                    // Add error styling to field
                    field.style.borderColor = 'red';
                } else {
                    // Remove error styling
                    field.style.borderColor = '';
                }
            };

            field.addEventListener('blur', () => {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                const result = this.validateForm(data, { [fieldName]: rules[fieldName] });
                const fieldResult = result.fields[fieldName];
                
                showError(fieldResult.isValid ? '' : fieldResult.message);
            });

            // Clear error on input
            field.addEventListener('input', () => {
                if (field.parentNode.querySelector('.validation-error')) {
                    showError('');
                }
            });
        });
    }
}

// Create and export singleton instance
const validation = new ValidationUtils();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = validation;
}

// Global access
window.validation = validation;
