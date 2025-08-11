/**
 * API Client for handling HTTP requests
 * Base API URL: localhost:8080/api (for development mode)
 */

class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:8080/api';  // Keep /api for dev mode
        this.timeout = 30000; // 30 seconds
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Get headers with authentication
     * @param {object} additionalHeaders - Additional headers to include
     * @returns {object} Combined headers
     */
    getHeaders(additionalHeaders = {}) {
        console.log('🔑 === BUILDING HEADERS ===');
        
        const headers = { ...this.defaultHeaders, ...additionalHeaders };
        console.log('🔑 Base headers:', headers);
        
        // Add authentication header if user is authenticated
        if (typeof authUtils !== 'undefined' && authUtils.isAuthenticated()) {
            console.log('🔑 User is authenticated, adding auth header...');
            const authHeader = authUtils.getAuthHeader();
            console.log('🔑 Auth header:', authHeader);
            Object.assign(headers, authHeader);
        } else {
            console.log('🔑 User not authenticated or authUtils not available');
            if (typeof authUtils === 'undefined') {
                console.log('🔑 authUtils is undefined');
            } else {
                console.log('🔑 authUtils.isAuthenticated() returned false');
            }
        }
        
        console.log('🔑 Final headers:', headers);
        return headers;
    }

    /**
     * Handle response and check for errors
     * @param {Response} response - Fetch response object
     * @returns {Promise<any>} Parsed response data
     */
    async handleResponse(response) {
        console.log('🔄 === HANDLE RESPONSE ===');
        console.log('🔄 Response status:', response.status);
        console.log('🔄 Response statusText:', response.statusText);
        console.log('🔄 Response ok:', response.ok);
        console.log('🔄 Response type:', response.type);
        console.log('🔄 Response URL:', response.url);
        
        const contentType = response.headers.get('content-type');
        console.log('🔄 Content-Type:', contentType);
        
        // Log all response headers
        console.log('🔄 All response headers:');
        for (let [key, value] of response.headers.entries()) {
            console.log(`🔄   ${key}: ${value}`);
        }
        
        let data;
        
        // Try to parse as JSON first, fall back to text if it fails
        try {
            if (contentType && contentType.includes('application/json')) {
                console.log('🔄 Parsing response as JSON...');
                data = await response.json();
                console.log('✅ JSON parsing successful. Data:', data);
            } else {
                console.log('🔄 Parsing response as text...');
                data = await response.text();
                console.log('✅ Text parsing successful. Data:', data);
            }
        } catch (parseError) {
            // If JSON parsing fails, try to get as text
            console.warn('⚠️ Failed to parse response as JSON, trying as text:', parseError);
            try {
                data = await response.text();
                console.log('✅ Fallback text parsing successful. Data:', data);
            } catch (textError) {
                console.error('❌ Failed to parse response as text:', textError);
                throw new Error('Failed to parse server response');
            }
        }

        if (!response.ok) {
            console.error('❌ Response not OK. Status:', response.status);
            console.error('❌ Response data:', data);
            
            // Handle different HTTP status codes
            switch (response.status) {
                case 401:
                    // Unauthorized - DON'T auto logout to prevent refresh loop
                    console.warn('🔒 API returned 401 Unauthorized');
                    console.warn('🔒 NOT calling authUtils.logout() to prevent refresh loop');
                    // if (typeof authUtils !== 'undefined') {
                    //     console.warn('🔒 Calling authUtils.logout()');
                    //     authUtils.logout();
                    // }
                    throw new Error('Unauthorized access. Please login again.');
                
                case 403:
                    console.warn('🚫 API returned 403 Forbidden');
                    throw new Error('Access forbidden. You don\'t have permission.');
                
                case 404:
                    console.warn('📭 API returned 404 Not Found');
                    throw new Error('Resource not found.');
                
                case 422:
                    // Validation errors
                    const message = typeof data === 'object' && data.message ? data.message : 'Validation failed.';
                    console.warn('⚠️ API returned 422 Validation Error:', message);
                    throw new Error(message);
                
                case 500:
                    console.error('💥 API returned 500 Internal Server Error');
                    throw new Error('Internal server error. Please try again later.');
                
                default:
                    console.error(`💥 API returned ${response.status}:`, data);
                    const errorMessage = typeof data === 'object' && data.message ? data.message : `HTTP Error: ${response.status}`;
                    throw new Error(errorMessage);
            }
        }

        console.log('✅ === RESPONSE HANDLED SUCCESSFULLY ===');
        console.log('✅ Final data to return:', data);
        console.log('✅ Data type:', typeof data);
        console.log('✅ Data is array:', Array.isArray(data));
        console.log('✅ Data keys (if object):', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
        
        return data;
    }

    /**
     * Handle response, support no-body (204 No Content)
     * @param {Response} response
     * @returns {Promise<any>} Parsed data or null for 204
     */
    async handleResponseNoBody(response) {
        console.log('🔄 [NoBody] Response status:', response.status);
        if (response.status === 204) {
            console.log('✅ [NoBody] 204 No Content, returning null');
            return null;
        }
        // Parse body only once
        const contentType = response.headers.get('content-type');
        let data;
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        } catch (parseError) {
            data = null;
        }
        if (!response.ok) {
            throw new Error(data && data.message ? data.message : `HTTP Error: ${response.status}`);
        }
        return data;
    }

    /**
     * Create fetch request with timeout
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithTimeout(url, options = {}) {
        console.log('🌐 FETCH: Starting request to:', url);
        console.log('🌐 FETCH: Request options:', options);
        console.log('🌐 FETCH: Request headers:', options.headers);
        console.log('🌐 FETCH: Timeout set to:', this.timeout, 'ms');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ FETCH: Request timed out after', this.timeout, 'ms');
            controller.abort();
        }, this.timeout);

        try {
            console.log('🌐 FETCH: Making actual fetch call...');
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            console.log('✅ FETCH: Response received');
            console.log('✅ FETCH: Status:', response.status);
            console.log('✅ FETCH: Status text:', response.statusText);
            console.log('✅ FETCH: Headers:', response.headers);
            console.log('✅ FETCH: Response type:', response.type);
            console.log('✅ FETCH: Response URL:', response.url);
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ FETCH: Request failed');
            console.error('❌ FETCH: Error name:', error.name);
            console.error('❌ FETCH: Error message:', error.message);
            
            if (error.name === 'AbortError') {
                console.error('⏰ FETCH: Request was aborted (timeout)');
                throw new Error('Request timeout. Please check your connection.');
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('🌐 FETCH: Network error - server may be down or CORS issue');
            }
            
            throw error;
        }
    }

    /**
     * Generic request method
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async request(method, endpoint, data = null, options = {}) {
        let url = ''; // Initialize url variable to prevent "url is not defined" error
        let requestOptions = {}; // Initialize requestOptions variable
        
        try {
            url = `${this.baseURL}${endpoint}`;
            const headers = this.getHeaders(options.headers);
            
            requestOptions = {
                method: method.toUpperCase(),
                headers,
                ...options
            };

            // Add body for non-GET requests
            if (data && method.toUpperCase() !== 'GET') {
                if (data instanceof FormData) {
                    // Remove Content-Type header to let browser set it with boundary
                    delete requestOptions.headers['Content-Type'];
                    requestOptions.body = data;
                } else {
                    requestOptions.body = JSON.stringify(data);
                }
            }

            // Add query parameters for GET requests
            if (data && method.toUpperCase() === 'GET') {
                const params = new URLSearchParams(data);
                url += `?${params.toString()}`;
            }

            const response = await this.fetchWithTimeout(url, requestOptions);
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`❌ === API REQUEST ERROR ===`);
            console.error(`❌ Method: ${method}`);
            console.error(`❌ Endpoint: ${endpoint}`);
            console.error(`❌ Full URL: ${url}`); // Now url is always defined
            console.error(`❌ Error Type: ${error.constructor.name}`);
            console.error(`❌ Error Message: ${error.message}`);
            console.error(`❌ Error Stack:`, error.stack);
            console.error(`❌ Request Options:`, requestOptions); // Now requestOptions is always defined
            
            // Check if it's a network error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error(`❌ NETWORK ERROR: Failed to fetch - this is likely a CORS or server connection issue`);
                console.error(`❌ Check if backend server is running on: ${this.baseURL}`);
                console.error(`❌ Check if CORS is properly configured on the backend`);
            }
            
            // Check if it's a timeout error
            if (error.message.includes('timeout')) {
                console.error(`❌ TIMEOUT ERROR: Request timed out after ${this.timeout}ms`);
            }
            
            throw error;
        }
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @param {object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async get(endpoint, params = null, options = {}) {
        return this.request('GET', endpoint, params, options);
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async post(endpoint, data = null, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async put(endpoint, data = null, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    /**
     * PATCH request
     * @param {string} endpoint - API endpoint
     * @param {any} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async patch(endpoint, data = null, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @param {object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    /**
     * Upload file
     * @param {string} endpoint - API endpoint
     * @param {File|FileList} files - File(s) to upload
     * @param {object} additionalData - Additional form data
     * @param {function} onProgress - Progress callback
     * @returns {Promise<any>} Response data
     */
    async uploadFile(endpoint, files, additionalData = {}, onProgress = null) {
        try {
            console.log(`API Client uploadFile called:`, {
                endpoint,
                files: Array.isArray(files) ? `Array[${files.length}]` : 
                       files instanceof File ? `File: ${files.name}` : 
                       files instanceof FileList ? `FileList[${files.length}]` : files,
                additionalData,
                onProgress: !!onProgress
            });
            
            const formData = new FormData();
            
            // Add files - handle different input types
            if (Array.isArray(files)) {
                console.log(`Adding Array with ${files.length} files`);
                files.forEach((file, index) => {
                    if (file instanceof File) {
                        formData.append('files', file);
                        console.log(`Added file[${index}]: ${file.name} (${file.size} bytes)`);
                    }
                });
            } else if (files instanceof FileList) {
                console.log(`Adding FileList with ${files.length} files`);
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                    console.log(`Added file[${i}]: ${files[i].name} (${files[i].size} bytes)`);
                }
            } else if (files instanceof File) {
                console.log(`Adding single file: ${files.name} (${files.size} bytes)`);
                formData.append('files', files);
            } else {
                console.error('Invalid files parameter:', files);
                throw new Error('Files parameter must be File, FileList, or Array of Files');
            }
            
            // Add additional data
            Object.keys(additionalData).forEach(key => {
                console.log(`Adding additional data: ${key} = ${additionalData[key]}`);
                formData.append(key, additionalData[key]);
            });

            console.log(`FormData entries:`, Array.from(formData.entries()).map(([key, value]) => [
                key, 
                value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
            ]));

            const headers = this.getHeaders();
            delete headers['Content-Type']; // Let browser set Content-Type with boundary
            
            console.log(`Upload headers:`, headers);
            console.log(`Upload URL: ${this.baseURL}${endpoint}`);

            const options = {
                method: 'POST',
                body: formData,
                headers
            };

            // Add progress tracking if XMLHttpRequest is available
            if (onProgress && typeof XMLHttpRequest !== 'undefined') {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            onProgress(percentComplete);
                        }
                    });
                    
                    xhr.addEventListener('load', async () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                resolve(data);
                            } catch (error) {
                                resolve(xhr.responseText);
                            }
                        } else {
                            reject(new Error(`Upload failed: ${xhr.status}`));
                        }
                    });
                    
                    xhr.addEventListener('error', () => {
                        reject(new Error('Upload failed'));
                    });
                    
                    xhr.open('POST', `${this.baseURL}${endpoint}`);
                    
                    // Set headers
                    Object.keys(headers).forEach(key => {
                        xhr.setRequestHeader(key, headers[key]);
                    });
                    
                    xhr.send(formData);
                });
            } else {
                const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, options);
                return await this.handleResponse(response);
            }
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }

    /**
     * Download file
     * @param {string} endpoint - API endpoint
     * @param {string} filename - Filename for download
     * @param {object} params - Query parameters
     * @returns {Promise<void>}
     */
    async downloadFile(endpoint, filename = 'download', params = null) {
        try {
            let url = `${this.baseURL}${endpoint}`;
            
            if (params) {
                const searchParams = new URLSearchParams(params);
                url += `?${searchParams.toString()}`;
            }
            
            const headers = this.getHeaders();
            const response = await this.fetchWithTimeout(url, { headers });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('File download error:', error);
            throw error;
        }
    }

    /**
     * Set base URL
     * @param {string} url - New base URL
     */
    setBaseURL(url) {
        this.baseURL = url;
    }

    /**
     * Set timeout
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }

    /**
     * Set default headers
     * @param {object} headers - Default headers
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }
}

// Create and export singleton instance
const apiClient = new ApiClient();

// Common API endpoints as helper methods
class ApiEndpoints {
    constructor(client) {
        this.client = client;
    }

    // Authentication endpoints
    auth = {
        login: (credentials) => this.client.post('/auth/login', credentials),
        register: (userData) => this.client.post('/users/register', userData),
        logout: () => this.client.post('/auth/logout'),
        refreshToken: (token) => this.client.post('/auth/refresh', { refreshToken: token }),
        forgotPassword: (email) => this.client.post('/auth/forgot-password', { email }),
        resetPassword: (token, password) => this.client.post('/auth/reset-password', { token, password }),
        changePassword: (data) => this.client.put('/auth/change-password', data),
        googleLogin: (token) => this.client.post('/auth/google', { token })
    };

    // User endpoints
    users = {
        register: (userData) => this.client.post('/users/register', userData),
        getProfile: () => this.client.get('/users/profile'),
        updateProfile: (data) => this.client.put('/users/profile', data),
        getUsers: (params) => this.client.get('/users', params),
        getUserById: (id) => this.client.get(`/users/${id}`),
        deleteUser: (id) => this.client.delete(`/users/${id}`)
    };

    // Project endpoints
    projects = {
        getAll: (params) => this.client.get('/projects', params),
        getById: (id) => this.client.get(`/projects/${id}`),
        create: (data) => this.client.post('/projects', data),
        update: (id, data) => this.client.put(`/projects/${id}`, data),
        delete: (id) => this.client.delete(`/projects/${id}`),
        getMembers: (id) => this.client.get(`/projects/${id}/members`),
        addMember: (id, memberData) => this.client.post(`/projects/${id}/members`, memberData),
        removeMember: (id, memberId) => this.client.delete(`/projects/${id}/members/${memberId}`)
    };

    // Task endpoints
    tasks = {
        getAll: (params) => this.client.get('/tasks', params),
        getById: (id) => this.client.get(`/tasks/${id}`),
        create: (data) => this.client.post('/tasks', data),
        update: (id, data) => this.client.put(`/tasks/${id}`, data),
        delete: (id) => this.client.delete(`/tasks/${id}`),
        getByProject: (projectId, params) => this.client.get(`/projects/${projectId}/tasks`, params)
    };

    // File endpoints
    files = {
        upload: (files, data, onProgress) => this.client.uploadFile('/files/upload', files, data, onProgress),
        download: (id, filename) => this.client.downloadFile(`/files/${id}`, filename),
        delete: (id) => this.client.delete(`/files/${id}`),
        getByProject: (projectId) => this.client.get(`/projects/${projectId}/files`)
    };

    // Notification endpoints
    notifications = {
        getAll: (params) => this.client.get('/notifications', params),
        markAsRead: (id) => this.client.put(`/notifications/${id}/read`),
        markAllAsRead: () => this.client.put('/notifications/read-all'),
        delete: (id) => this.client.delete(`/notifications/${id}`)
    };

    // Invitation endpoints
    invites = {
        send: (data) => this.client.post('/invites', data),
        accept: (code) => this.client.post(`/invites/${code}/accept`),
        decline: (code) => this.client.post(`/invites/${code}/decline`),
        getByProject: (projectId) => this.client.get(`/projects/${projectId}/invites`)
    };
}

// Create API endpoints instance
const api = new ApiEndpoints(apiClient);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiClient, api };
}

// Global access
window.apiClient = apiClient;
window.api = api;
