/**
 * Create Project Page JavaScript
 * Handles form submission, file uploads, and validation
 */

class CreateProjectManager {
    constructor() {
        console.log('🔨 CreateProjectManager constructor called');
        this.selectedFiles = [];
        this.isSubmitting = false;
        
        // Validate required DOM elements exist
        this.validateDOMElements();
        
        this.init();
    }
    
    validateDOMElements() {
        const requiredElements = [
            'createProjectForm',
            'startDate',
            'endDate',
            'projectFiles',
            'filePreview',
            'fileList',
            'createBtn',
            'btnText',
            'loadingSpinner',
            'formContent',
            'successMessage'
        ];
        
        const missingElements = [];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingElements.push(id);
            }
        });
        
        if (missingElements.length > 0) {
            console.error('❌ Missing required DOM elements:', missingElements);
            console.error('❌ This may cause form submission and redirect issues');
        } else {
            console.log('✅ All required DOM elements found');
        }
    }

    init() {
        try {
            console.log('🔧 Initializing CreateProjectManager...');
            
            // Check authentication on page load
            if (!authUtils.isAuthenticated()) {
                console.log('❌ User not authenticated, redirecting to auth page');
                window.location.href = '/front_end/auth.html';
                return;
            }
            console.log('✅ User authenticated');

            // Set min date to today
            this.setMinDates();
            console.log('✅ Min dates set');
            
            // Setup components
            this.setupFilePreview();
            console.log('✅ File preview setup');
            
            this.setupFormValidation();
            console.log('✅ Form validation setup');
            
            this.setupFormSubmission();
            console.log('✅ Form submission setup');
            
            this.setupBeforeUnload();
            console.log('✅ Before unload setup');
            
            // Setup navbar components
            this.setupUserInfo();
            console.log('✅ User info setup initiated');
            
            this.setupNotifications();
            console.log('✅ Notifications setup initiated');
            
            console.log('🎉 CreateProjectManager initialization completed');
        } catch (error) {
            console.error('❌ Error during CreateProjectManager initialization:', error);
            console.error('❌ Error stack:', error.stack);
            // Don't throw - let page load even if there are issues
        }
    }

    setMinDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('startDate').min = today;
        document.getElementById('endDate').min = today;
    }

    setupFilePreview() {
        const fileInput = document.getElementById('projectFiles');
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            files.forEach(file => {
                if (!this.validateFile(file)) return;
                if (this.isDuplicateFile(file)) {
                    this.showAlert(`File "${file.name}" đã được thêm.`, 'warning');
                    return;
                }
                
                this.selectedFiles.push(file);
            });

            this.updateFileDisplay();
            fileInput.value = ''; // Clear input to allow selecting the same file again
        });
    }

    validateFile(file) {
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showAlert(`File "${file.name}" quá lớn. Vui lòng chọn file nhỏ hơn 10MB.`, 'error');
            return false;
        }

        // Validate file type
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            this.showAlert(`File "${file.name}" không được hỗ trợ. Vui lòng chọn file có định dạng: ${allowedExtensions.join(', ')}`, 'error');
            return false;
        }

        return true;
    }

    isDuplicateFile(file) {
        return this.selectedFiles.some(f => f.name === file.name && f.size === file.size);
    }

    updateFileDisplay() {
        const filePreview = document.getElementById('filePreview');
        const fileList = document.getElementById('fileList');

        if (this.selectedFiles.length > 0) {
            filePreview.classList.add('has-files');
            
            const filesHtml = this.selectedFiles.map((file, index) => `
                <div class="file-item" data-index="${index}">
                    <div class="file-info">
                        <i class="bi ${this.getFileIcon(file.name)} file-icon"></i>
                        <div>
                            <div class="file-name">${this.escapeHtml(file.name)}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                    </div>
                    <button type="button" class="remove-file" onclick="createProjectManager.removeFile(${index})" title="Xóa file">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            `).join('');

            fileList.innerHTML = filesHtml;
        } else {
            filePreview.classList.remove('has-files');
            fileList.innerHTML = '';
        }
    }

    getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'bi-file-earmark-pdf',
            'doc': 'bi-file-earmark-word',
            'docx': 'bi-file-earmark-word',
            'xls': 'bi-file-earmark-excel',
            'xlsx': 'bi-file-earmark-excel',
            'ppt': 'bi-file-earmark-ppt',
            'pptx': 'bi-file-earmark-ppt',
            'txt': 'bi-file-earmark-text',
            'zip': 'bi-file-earmark-zip',
            'rar': 'bi-file-earmark-zip'
        };
        return iconMap[extension] || 'bi-file-earmark';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileDisplay();
    }

    setupFormValidation() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        // Update end date min value when start date changes
        startDateInput.addEventListener('change', () => {
            endDateInput.min = startDateInput.value;
            if (endDateInput.value && endDateInput.value < startDateInput.value) {
                endDateInput.value = startDateInput.value;
            }
            this.validateEndDate();
        });

        // Validate end date is after start date
        endDateInput.addEventListener('change', () => {
            this.validateEndDate();
        });
    }

    validateEndDate() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput.value && endDateInput.value && endDateInput.value < startDateInput.value) {
            endDateInput.setCustomValidity('Ngày kết thúc phải sau ngày bắt đầu');
        } else {
            endDateInput.setCustomValidity('');
        }
    }

    setupFormSubmission() {
        const form = document.getElementById('createProjectForm');
        
        form.addEventListener('submit', async (e) => {
            // Always prevent default form submission
            e.preventDefault();
            e.stopPropagation();
            
            console.log('📝 Form submitted, preventing default behavior');
            
            if (this.isSubmitting) {
                console.log('⏸️ Already submitting, ignoring duplicate submission');
                return;
            }
            
            if (!form.checkValidity()) {
                console.log('❌ Form validation failed');
                form.classList.add('was-validated');
                return;
            }

            try {
                console.log('✅ Form valid, calling handleCreateProject');
                await this.handleCreateProject();
            } catch (error) {
                console.error('❌ Error in form submission:', error);
                this.showAlert('Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại.', 'error');
                this.setLoadingState(false);
                this.isSubmitting = false;
            }
        });
    }

    async handleCreateProject() {
        if (this.isSubmitting) {
            console.log('⏸️ Already submitting, skipping');
            return;
        }
        
        console.log('🚀 Starting project creation process');
        this.isSubmitting = true;
        this.setLoadingState(true);
        
        try {
            // Step 1: Create project
            console.log('📝 Step 1: Creating project...');
            const projectData = await this.createProject();
            console.log('✅ Step 1 completed: Project created successfully:', projectData);
            
            // Step 2: Upload files if selected
            if (this.selectedFiles.length > 0 && projectData.id) {
                console.log('📁 Step 2: Uploading files for project ID:', projectData.id);
                await this.uploadProjectFiles(projectData.id);
                console.log('✅ Step 2 completed: Files uploaded');
            } else {
                console.log('⏭️ Step 2 skipped: No files to upload');
            }

            // Step 3: Show success message
            console.log('🎉 Step 3: Showing success message');
            this.showSuccessMessage(projectData);

            // Step 4: Handle redirect - TEST REDIRECT IMMEDIATELY FOR DEBUGGING
            console.log('🧪 Testing immediate redirect for debugging...');
            if (projectData && projectData.id) {
                // Test immediate redirect first
                this.testRedirectAfterDelay(projectData, 1000);
            }

            // Step 4: Handle redirect
            if (projectData && projectData.id) {
                console.log('🔍 Project data validation for redirect:');
                console.log('- projectData exists:', !!projectData);
                console.log('- projectData.id exists:', !!projectData.id);
                console.log('- projectData.id value:', projectData.id);
                console.log('- projectData.id type:', typeof projectData.id);
                console.log('- Number.isInteger check:', Number.isInteger(projectData.id));
                console.log('- projectData.id > 0:', projectData.id > 0);
                
                if (Number.isInteger(projectData.id) && projectData.id > 0) {
                    console.log('✅ Valid project data for auto-redirect:', {
                        id: projectData.id,
                        name: projectData.name,
                        type: typeof projectData.id
                    });
                    
                    // Redirect to project details after 2 seconds
                    console.log('⏰ Setting timeout for auto-redirect...');
                    const timeoutId = setTimeout(() => {
                        const targetUrl = `project-details.html?id=${projectData.id}`;
                        console.log('🚀 Auto-redirecting to:', targetUrl);
                        console.log('🌍 Current location:', window.location.href);
                        console.log('🌍 Target location:', window.location.origin + '/' + targetUrl);
                        
                        try {
                            window.location.href = targetUrl;
                        } catch (redirectError) {
                            console.error('❌ Redirect error:', redirectError);
                            // Fallback
                            window.location.replace(targetUrl);
                        }
                    }, 2000);
                    
                    console.log('⏰ Timeout ID:', timeoutId, '- Will redirect in 2 seconds');
                } else {
                    console.error('❌ Project ID validation failed:');
                    console.error('- ID value:', projectData.id);
                    console.error('- Is integer:', Number.isInteger(projectData.id));
                    console.error('- Is positive:', projectData.id > 0);
                }
            } else {
                console.error('❌ Cannot redirect: Invalid project data structure', {
                    projectData,
                    hasProjectData: !!projectData,
                    hasId: !!projectData?.id,
                    idValue: projectData?.id
                });
                
                // Show alternative success message without redirect
                this.showAlert('Dự án đã tạo thành công nhưng không thể chuyển hướng tự động', 'warning');
                setTimeout(() => {
                    console.log('🔄 Fallback redirect to projects list');
                    window.location.href = 'projects.html';
                }, 3000);
            }

        } catch (error) {
            console.error('❌ Error in handleCreateProject:', error);
            console.error('❌ Error stack:', error.stack);
            
            // Reset state properly
            this.setLoadingState(false);
            this.isSubmitting = false;
            
            // Show user-friendly error
            let errorMessage = 'Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại.';
            if (error.message && error.message.includes('Failed to create project')) {
                errorMessage = 'Không thể tạo dự án. Vui lòng kiểm tra thông tin và thử lại.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
            }
            
            this.showAlert(errorMessage, 'error');
        }
    }

    async createProject() {
        const formData = new FormData(document.getElementById('createProjectForm'));
        
        // Convert FormData to JSON for project creation
        const projectData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate')
        };

        const response = await apiClient.post('/projects/create', projectData);

        console.log('📝 Project creation response:', {
            response,
            hasId: !!response?.id,
            idValue: response?.id,
            idType: typeof response?.id,
            isInteger: Number.isInteger(response?.id),
            responseKeys: Object.keys(response || {})
        });
        
        // Check if response contains project data (has id field)
        if (!response || !response.id) {
            console.error('❌ Invalid response structure:', response);
            throw new Error(response?.message || 'Failed to create project - Invalid response');
        }

        // Validate project ID for redirect
        if (!Number.isInteger(response.id) || response.id <= 0) {
            console.warn('⚠️ Invalid project ID received:', {
                id: response.id,
                type: typeof response.id,
                isInteger: Number.isInteger(response.id),
                isPositive: response.id > 0
            });
            throw new Error('Invalid project ID returned from server');
        }

        console.log('✅ Valid project created with ID:', response.id);
        return response;
    }

    async uploadProjectFiles(projectId) {
        if (this.selectedFiles.length === 0) return;

        console.log(`📁 Starting batch upload of ${this.selectedFiles.length} files for project ${projectId}`);

        try {
            // Create FileList-like object for API client
            const fileArray = Array.from(this.selectedFiles);
            
            console.log('📁 Files to upload:', fileArray.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type
            })));

            // Use API client with all files at once
            try {
                console.log('📁 Attempting batch upload via API client...');
                const response = await apiClient.uploadFile('/files/upload', fileArray, { 
                    projectId: projectId 
                });
                
                console.log('📁 Batch upload response:', response);
                
                if (response && (response.success !== false)) {
                    console.log('✅ All files uploaded successfully via API client');
                    return;
                }
            } catch (apiError) {
                console.warn('📁 API client batch upload failed, trying direct fetch:', apiError);
            }

            // Fallback: Direct fetch with FormData containing all files
            const formData = new FormData();
            
            // Add all files with 'files' key
            this.selectedFiles.forEach((file, index) => {
                formData.append('files', file);
                console.log(`📁 Added file[${index}]: ${file.name} (${file.size} bytes)`);
            });
            
            // Add project ID
            formData.append('projectId', projectId);

            console.log('📁 FormData entries:', Array.from(formData.entries()).map(([key, value]) => [
                key, 
                value instanceof File ? `File: ${value.name}` : value
            ]));

            // Get auth headers
            const headers = {};
            if (typeof authUtils !== 'undefined' && authUtils.isAuthenticated()) {
                Object.assign(headers, authUtils.getAuthHeader());
            }

            console.log('📁 Direct fetch headers:', headers);
            console.log('📁 Direct fetch URL: http://localhost:8080/api/files/upload');

            const response = await fetch('http://localhost:8080/api/files/upload', {
                method: 'POST',
                body: formData,
                headers: headers
            });

            console.log('📁 Direct fetch response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('📁 Upload failed:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('📁 Upload success result:', result);
            
            if (result.uploadedFiles) {
                console.log(`✅ Successfully uploaded ${result.uploadedFiles.length} files`);
            }
            
            if (result.errors && result.errors.length > 0) {
                console.warn(`⚠️ Upload completed with ${result.errors.length} errors:`, result.errors);
            }

        } catch (error) {
            console.error('❌ Error in batch file upload:', error);
            // Don't throw - let project creation succeed even if file upload fails
            this.showAlert(`Dự án đã được tạo thành công nhưng có lỗi khi upload files: ${error.message}`, 'warning');
        }
    }

    setLoadingState(loading) {
        const createBtn = document.getElementById('createBtn');
        const btnText = document.getElementById('btnText');
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        createBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        loadingSpinner.style.display = loading ? 'flex' : 'none';
    }

    showSuccessMessage(projectData = null) {
        const formContent = document.getElementById('formContent');
        const successMessage = document.getElementById('successMessage');
        
        // Update success message content with project info
        if (projectData && projectData.id) {
            const projectName = projectData.name || 'Dự án mới';
            const projectId = String(projectData.id); // Ensure ID is string
            const successContent = successMessage.querySelector('.success-content');
            if (successContent) {
                successContent.innerHTML = `
                    <div class="text-center">
                        <i class="bi bi-check-circle-fill text-success mb-3" style="font-size: 4rem;"></i>
                        <h4 class="text-success mb-3">Tạo dự án thành công!</h4>
                        <p class="mb-4">Dự án "<strong>${this.escapeHtml(projectName)}</strong>" đã được tạo thành công.</p>
                        <div class="d-grid gap-2 d-md-block">
                            <button type="button" class="btn btn-primary me-2" data-project-id="${projectId}">
                                <i class="bi bi-eye me-2"></i>Xem dự án
                            </button>
                            <button type="button" class="btn btn-outline-secondary">
                                <i class="bi bi-list me-2"></i>Danh sách dự án
                            </button>
                        </div>
                        <p class="text-muted mt-3 small">
                            <i class="bi bi-info-circle me-1"></i>
                            Bạn sẽ được chuyển hướng tự động sau 2 giây...
                        </p>
                    </div>
                `;
                
                // Add event listeners to buttons (safer than onclick in template)
                const viewProjectBtn = successContent.querySelector('[data-project-id]');
                const projectListBtn = successContent.querySelector('.btn-outline-secondary');
                
                if (viewProjectBtn) {
                    viewProjectBtn.addEventListener('click', () => {
                        this.redirectToProject(projectId);
                    });
                }
                
                if (projectListBtn) {
                    projectListBtn.addEventListener('click', () => {
                        window.location.href = 'projects.html';
                    });
                }
            }
        }
        
        formContent.style.display = 'none';
        successMessage.style.display = 'block';
    }
    
    // Test method for debugging redirect issues
    testRedirectAfterDelay(projectData, delay = 1000) {
        console.log(`🧪 Setting up test redirect after ${delay}ms...`);
        console.log('🧪 Project data for test redirect:', projectData);
        
        setTimeout(() => {
            console.log('🧪 Test redirect executing...');
            console.log('🧪 Current page location:', window.location.href);
            console.log('🧪 Document ready state:', document.readyState);
            console.log('🧪 Window object available:', typeof window);
            
            if (!projectData || !projectData.id) {
                console.error('🧪 Test failed: No valid project data');
                return;
            }
            
            const testUrl = `project-details.html?id=${projectData.id}`;
            console.log('🧪 Test redirect URL:', testUrl);
            console.log('🧪 Full URL would be:', window.location.origin + '/' + testUrl);
            
            // Check if project-details.html exists by testing navigation
            console.log('🧪 Attempting test redirect...');
            
            try {
                // Force redirect with replace to avoid back button issues
                console.log('🧪 Using window.location.replace for test...');
                window.location.replace(testUrl);
            } catch (error) {
                console.error('🧪 Test redirect failed:', error);
                // Try alternative method
                console.log('🧪 Trying window.location.href as backup...');
                window.location.href = testUrl;
            }
        }, delay);
    }

    // Helper method for immediate redirect to project
    redirectToProject(projectId) {
        console.log('🔄 redirectToProject called with ID:', projectId, 'Type:', typeof projectId);
        
        if (!projectId) {
            console.error('❌ No project ID provided for redirect');
            this.showAlert('Không thể chuyển hướng: Thiếu ID dự án', 'error');
            // Fallback to projects list
            setTimeout(() => {
                window.location.href = 'projects.html';
            }, 1000);
            return;
        }

        // Ensure projectId is valid
        const id = String(projectId).trim();
        if (!id || id === 'null' || id === 'undefined') {
            console.error('❌ Invalid project ID for redirect:', projectId);
            this.showAlert('Không thể chuyển hướng: ID dự án không hợp lệ', 'error');
            setTimeout(() => {
                window.location.href = 'projects.html';
            }, 1000);
            return;
        }

        try {
            const targetUrl = `project-details.html?id=${id}`;
            console.log('🚀 Manual redirect to:', targetUrl);
            console.log('🌍 Current location:', window.location.href);
            console.log('🌍 Target location:', window.location.origin + '/' + targetUrl);
            
            // Test if the URL is valid before redirecting
            const url = new URL(targetUrl, window.location.origin);
            console.log('✅ Valid URL created:', url.href);
            
            // Try multiple redirect methods
            console.log('🔄 Attempting window.location.href redirect...');
            window.location.href = targetUrl;
            
            // Fallback after small delay if href doesn't work
            setTimeout(() => {
                console.log('🔄 Fallback: Attempting window.location.replace...');
                window.location.replace(targetUrl);
            }, 100);
            
            // Last resort fallback
            setTimeout(() => {
                console.log('🔄 Last resort: Attempting window.open...');
                window.open(targetUrl, '_self');
            }, 500);
            
        } catch (error) {
            console.error('❌ Error creating redirect URL:', error);
            this.showAlert('Có lỗi khi chuyển hướng đến dự án', 'error');
            // Fallback
            setTimeout(() => {
                window.location.href = 'projects.html';
            }, 1000);
        }
    }

    showAlert(message, type = 'info') {
        // Simple alert for now, can be replaced with a better notification system
        const alertTypes = {
            'error': '❌ ',
            'warning': '⚠️ ',
            'success': '✅ ',
            'info': 'ℹ️ '
        };
        
        alert((alertTypes[type] || '') + message);
    }

    goBack() {
        if (this.hasFormData() && !confirm('Bạn có chắc chắn muốn quay lại? Dữ liệu đã nhập sẽ bị mất.')) {
            return;
        }
        window.location.href = 'index.html';
    }

    hasFormData() {
        const form = document.getElementById('createProjectForm');
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            if (value && value.toString().trim()) {
                return true;
            }
        }
        
        return this.selectedFiles.length > 0;
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasFormData() && !this.isSubmitting) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    openFileDialog() {
        document.getElementById('projectFiles').click();
    }

    // User and Notification Setup
    async setupUserInfo() {
        try {
            const userInfo = await apiClient.get('/users/profile');
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName && userInfo.name) {
                userDisplayName.textContent = userInfo.name;
            }
        } catch (error) {
            console.warn('Failed to load user info:', error);
        }
    }

    async setupNotifications() {
        try {
            await this.loadNotifications();
            // Setup periodic notification refresh (every 30 seconds)
            setInterval(() => this.loadNotifications(), 30000);
        } catch (error) {
            console.warn('Failed to setup notifications:', error);
        }
    }

    async loadNotifications() {
        try {
            const notifications = await apiClient.get('/notifications', { limit: 10, unreadOnly: false });
            this.updateNotificationDisplay(notifications);
        } catch (error) {
            console.warn('Failed to load notifications:', error);
        }
    }

    updateNotificationDisplay(notifications) {
        const notificationCount = document.getElementById('notificationCount');
        const notificationList = document.getElementById('notificationList');
        
        if (!notifications || !Array.isArray(notifications)) {
            return;
        }

        // Update notification count
        const unreadCount = notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            notificationCount.textContent = unreadCount > 99 ? '99+' : unreadCount;
            notificationCount.style.display = 'flex';
        } else {
            notificationCount.style.display = 'none';
        }

        // Update notification list
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="dropdown-item-text text-muted text-center py-3">
                    Không có thông báo mới
                </div>
            `;
        } else {
            const notificationHtml = notifications.map(notification => `
                <div class="notification-item ${!notification.read ? 'unread' : ''}" onclick="markNotificationAsRead(${notification.id})">
                    <div class="notification-title">${this.escapeHtml(notification.title || 'Thông báo')}</div>
                    <div class="notification-content">${this.escapeHtml(notification.message || '')}</div>
                    <div class="notification-time">${this.formatNotificationTime(notification.createdAt)}</div>
                </div>
            `).join('');
            
            notificationList.innerHTML = notificationHtml;
        }
    }

    formatNotificationTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Vừa xong';
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} giờ trước`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} ngày trước`;
        
        return date.toLocaleDateString('vi-VN');
    }
}

// Global functions for HTML onclick handlers
function goBack() {
    createProjectManager.goBack();
}

function openFileDialog() {
    createProjectManager.openFileDialog();
}

// User and Notification Global Functions
async function viewProfile() {
    // Redirect to profile page or open modal
    window.location.href = 'profile.html';
}

async function editProfile() {
    // Redirect to profile page for editing
    window.location.href = 'profile.html';
}

async function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }
        
        authUtils.logout();
        window.location.href = 'auth.html';
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        await apiClient.put(`/notifications/${notificationId}/read`);
        // Reload notifications to update the display
        await createProjectManager.loadNotifications();
    } catch (error) {
        console.warn('Failed to mark notification as read:', error);
    }
}

async function markAllAsRead() {
    try {
        await apiClient.put('/notifications/read-all');
        // Reload notifications to update the display
        await createProjectManager.loadNotifications();
    } catch (error) {
        console.warn('Failed to mark all notifications as read:', error);
    }
}

// Initialize when DOM is loaded
let createProjectManager;
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('🚀 DOM loaded, initializing CreateProjectManager...');
        createProjectManager = new CreateProjectManager();
        console.log('✅ CreateProjectManager instance created successfully');
    } catch (error) {
        console.error('❌ Failed to initialize CreateProjectManager:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Fallback: Still show the form even if JS fails
        const formContent = document.getElementById('formContent');
        if (formContent) {
            formContent.style.display = 'block';
        }
    }
});
