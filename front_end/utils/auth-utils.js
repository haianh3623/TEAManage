/**
 * Authentication and Security Utilities
 * Handles token-based authentication operations
 */

class AuthUtils {
    constructor() {
        this.TOKEN_KEY = 'auth_token';
        this.REFRESH_TOKEN_KEY = 'refresh_token';
        this.USER_INFO_KEY = 'user_info';
        this.TOKEN_EXPIRY_KEY = 'token_expiry';
    }

    /**
     * Save authentication token to localStorage
     * @param {string} token - JWT token
     * @param {string} refreshToken - Refresh token (optional)
     * @param {number} expiresIn - Token expiry time in seconds
     */
    saveToken(token, refreshToken = null, expiresIn = null) {
        try {
            localStorage.setItem(this.TOKEN_KEY, token);
            
            if (refreshToken) {
                localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
            }
            
            if (expiresIn) {
                const expiryTime = Date.now() + (expiresIn * 1000);
                localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
            }
            
            return true;
        } catch (error) {
            console.error('Error saving token:', error);
            return false;
        }
    }

    /**
     * Get authentication token from localStorage
     * @returns {string|null} JWT token
     */
    getToken() {
        try {
            return localStorage.getItem(this.TOKEN_KEY);
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    /**
     * Get refresh token from localStorage
     * @returns {string|null} Refresh token
     */
    getRefreshToken() {
        try {
            return localStorage.getItem(this.REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        console.log('🔍 AUTH CHECK: Starting authentication check...');
        
        const token = this.getToken();
        console.log('🔍 AUTH CHECK: Token exists:', !!token);
        console.log('🔍 AUTH CHECK: Token value:', token ? token.substring(0, 20) + '...' : 'null');
        
        if (!token) {
            console.log('❌ AUTH CHECK: No token found - user not authenticated');
            return false;
        }
        
        // Check if token is expired
        console.log('🔍 AUTH CHECK: Checking if token is expired...');
        const isExpired = this.isTokenExpired();
        console.log('🔍 AUTH CHECK: Token expired:', isExpired);
        
        if (isExpired) {
            console.log('❌ AUTH CHECK: Token expired - calling logout');
            this.logout();
            return false;
        }
        
        console.log('✅ AUTH CHECK: User is authenticated');
        return true;
    }

    /**
     * Check if token is expired
     * @returns {boolean} True if token is expired
     */
    isTokenExpired() {
        try {
            const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
            console.log('🕐 EXPIRY CHECK: Expiry time from storage:', expiryTime);
            
            if (!expiryTime) {
                console.log('🕐 EXPIRY CHECK: No expiry time found - assuming not expired');
                return false;
            }
            
            const currentTime = Date.now();
            const expiryTimestamp = parseInt(expiryTime);
            
            console.log('🕐 EXPIRY CHECK: Current time:', currentTime);
            console.log('🕐 EXPIRY CHECK: Expiry timestamp:', expiryTimestamp);
            console.log('🕐 EXPIRY CHECK: Time until expiry:', expiryTimestamp - currentTime, 'ms');
            
            const isExpired = currentTime > expiryTimestamp;
            console.log('🕐 EXPIRY CHECK: Is expired:', isExpired);
            
            return isExpired;
        } catch (error) {
            console.error('Error checking token expiry:', error);
            return true;
        }
    }

    /**
     * Decode JWT token payload
     * @param {string} token - JWT token
     * @returns {object|null} Decoded payload
     */
    decodeToken(token = null) {
        try {
            const tokenToDecode = token || this.getToken();
            if (!tokenToDecode) return null;
            
            const base64Url = tokenToDecode.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Get user information from token or localStorage
     * @returns {object|null} User information
     */
    getUserInfo() {
        try {
            // Try to get from localStorage first
            const userInfo = localStorage.getItem(this.USER_INFO_KEY);
            if (userInfo) {
                return JSON.parse(userInfo);
            }
            
            // If not found, try to decode from token
            const tokenPayload = this.decodeToken();
            return tokenPayload || null;
        } catch (error) {
            console.error('Error getting user info:', error);
            return null;
        }
    }

    /**
     * Save user information to localStorage
     * @param {object} userInfo - User information object
     */
    saveUserInfo(userInfo) {
        try {
            localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
        } catch (error) {
            console.error('Error saving user info:', error);
        }
    }

    /**
     * Get authorization header for API requests
     * @returns {object} Authorization header object
     */
    getAuthHeader() {
        console.log('🔐 AUTH HEADER: Getting auth header...');
        const token = this.getToken();
        console.log('🔐 AUTH HEADER: Token exists:', !!token);
        console.log('🔐 AUTH HEADER: Token value:', token ? token.substring(0, 30) + '...' : 'null');
        
        if (token) {
            const header = {
                'Authorization': `Bearer ${token}`
            };
            console.log('🔐 AUTH HEADER: Returning header with Bearer token');
            return header;
        }
        
        console.log('🔐 AUTH HEADER: No token, returning empty header');
        return {};
    }

    /**
     * Logout user and clear all stored data
     */
    logout() {
        try {
            console.log('🔑 LOGOUT: Starting logout process...');
            
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.REFRESH_TOKEN_KEY);
            localStorage.removeItem(this.USER_INFO_KEY);
            localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
            
            console.log('🔑 LOGOUT: Cleared all localStorage items');
            console.log('🔑 LOGOUT: Redirecting to auth.html');
            
            // Use relative path to prevent redirect loops
            window.location.href = 'auth.html';
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    /**
     * Check if user has specific role
     * @param {string} role - Role to check
     * @returns {boolean} True if user has the role
     */
    hasRole(role) {
        try {
            const userInfo = this.getUserInfo();
            if (!userInfo) return false;
            
            const userRoles = userInfo.roles || userInfo.authorities || [];
            return userRoles.includes(role) || userRoles.some(r => r.authority === role);
        } catch (error) {
            console.error('Error checking user role:', error);
            return false;
        }
    }

    /**
     * Check if user has any of the specified roles
     * @param {string[]} roles - Array of roles to check
     * @returns {boolean} True if user has any of the roles
     */
    hasAnyRole(roles) {
        return roles.some(role => this.hasRole(role));
    }

    /**
     * Refresh authentication token
     * @returns {Promise<boolean>} Success status
     */
    async refreshToken() {
        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                this.logout();
                return false;
            }
            
            // This would typically call your API's refresh endpoint
            // Implementation depends on your backend API
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.saveToken(data.token, data.refreshToken, data.expiresIn);
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Set up automatic token refresh
     * @param {number} bufferTime - Time in minutes before expiry to refresh token
     */
    setupAutoRefresh(bufferTime = 5) {
        const checkInterval = 60000; // Check every minute
        
        setInterval(async () => {
            const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
            if (!expiryTime) return;
            
            const timeUntilExpiry = parseInt(expiryTime) - Date.now();
            const bufferTimeMs = bufferTime * 60 * 1000;
            
            if (timeUntilExpiry <= bufferTimeMs && timeUntilExpiry > 0) {
                await this.refreshToken();
            }
        }, checkInterval);
    }

    /**
     * Generate CSRF token (if needed)
     * @returns {string} CSRF token
     */
    generateCSRFToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Secure password storage (for remember me functionality)
     * @param {string} password - Password to hash
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error('Error hashing password:', error);
            return null;
        }
    }
}

// Create and export singleton instance
const authUtils = new AuthUtils();

// Auto-setup token refresh on page load
document.addEventListener('DOMContentLoaded', () => {
    if (authUtils.isAuthenticated()) {
        authUtils.setupAutoRefresh();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authUtils;
}

// Global access
window.authUtils = authUtils;
