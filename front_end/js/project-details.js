/**
 * Project Details Page JavaScript
 * Handles project details display, tabs, and interactions
 */

// Debug: Track page load events
console.log('📄 project-details.js script loaded at:', new Date().toISOString());
console.log('📄 Document ready state:', document.readyState);
console.log('📄 Window location:', window.location.href);

// Track page visibility changes
document.addEventListener('visibilitychange', () => {
    console.log('👁️ Page visibility changed:', document.hidden ? 'hidden' : 'visible');
});

// Track beforeunload events
window.addEventListener('beforeunload', (e) => {
    console.log('🔄 Page about to unload/reload:', e);
});

class ProjectDetailsManager {
    constructor() {
        this.projectId = null;
        this.currentProject = null;
        this.currentUser = null;
        this.selectedMemberId = null;
        this.userCache = new Map(); // Cache for user data to avoid repeated API calls
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Project Details Manager');
        console.log('🚀 Current URL:', window.location.href);
        
        // Prevent multiple initializations
        if (window.projectDetailsManagerInitialized) {
            console.warn('⚠️ Project Details Manager already initialized, skipping...');
            return;
        }
        window.projectDetailsManagerInitialized = true;
        
        // Check authentication
        console.log('🔍 Checking authentication...');
        const isAuth = authUtils.isAuthenticated();
        console.log('🔍 Is authenticated:', isAuth);
        
        if (!isAuth) {
            console.log('❌ Not authenticated, redirecting to auth page');
            window.location.href = 'auth.html';
            return;
        }

        // Initialize notification service
        this.initializeNotificationService();

        // Get project ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.projectId = urlParams.get('id');
        console.log('🔍 Project ID from URL:', this.projectId);

        if (!this.projectId) {
            console.log('❌ No project ID found in URL');
            alert('ID dự án không được tìm thấy!');
            window.location.href = 'index.html';
            return;
        }

        // Load data
        console.log('🔄 Starting to load project and user data...');
        await Promise.all([
            this.loadProjectDetails(),
            this.loadCurrentUser()
        ]);
        
        // Check permissions after both are loaded
        console.log('🔄 Both project and user data loaded, checking permissions...');
        this.checkUserPermissions();
        
        console.log('🚀 Initialization completed');
    }

    initializeNotificationService() {
        try {
            const userInfo = authUtils.getUserInfo();
            if (userInfo && userInfo.id && window.notificationService) {
                console.log('🔔 Initializing notification service for user:', userInfo.id);
                notificationService.updateUser(userInfo.id);
                
                // Dispatch auth state changed event
                const authEvent = new CustomEvent('authStateChanged', {
                    detail: {
                        isAuthenticated: true,
                        user: userInfo
                    }
                });
                document.dispatchEvent(authEvent);
            }
        } catch (error) {
            console.error('❌ Error initializing notification service:', error);
        }
    }

    async loadCurrentUser() {
        try {
            console.log('🔄 Loading current user...');
            this.currentUser = await apiClient.get('/users/profile');
            console.log('✅ Current user loaded:', this.currentUser);
            console.log('✅ User email:', this.currentUser?.email);
            console.log('✅ User ID:', this.currentUser?.id);
            console.log('✅ User name:', this.currentUser?.fullName || this.currentUser?.name);
            
            // Update navbar with user info using UIUtils
            if (typeof UIUtils !== 'undefined') {
                UIUtils.updateUserDisplayName(this.currentUser);
            } else {
                console.log('⚠️ UIUtils not available, using fallback method');
                this.updateUserDisplayName();
            }
            
        } catch (error) {
            console.error('❌ Failed to load current user:', error);
            console.error('❌ Error message:', error.message);
            this.currentUser = null;
        }
    }

    updateUserDisplayName() {
        if (!this.currentUser) {
            console.log('⚠️ No current user data to display');
            return;
        }

        // Get user display name (try different fields)
        const displayName = this.currentUser.fullName || 
                          this.currentUser.name || 
                          this.currentUser.firstName + ' ' + (this.currentUser.lastName || '') ||
                          this.currentUser.email?.split('@')[0] || 
                          'User';

        console.log('🔄 Updating user display name to:', displayName);

        // Update navbar user name
        const userNameElement = document.getElementById('userDisplayName');
        if (userNameElement) {
            userNameElement.textContent = displayName;
            console.log('✅ Updated navbar user name');
        } else {
            console.log('❌ userDisplayName element not found');
        }

        // Update dropdown user name
        const dropdownNameElement = document.getElementById('userDisplayNameDropdown');
        if (dropdownNameElement) {
            dropdownNameElement.textContent = displayName;
            console.log('✅ Updated dropdown user name');
        } else {
            console.log('❌ userDisplayNameDropdown element not found');
        }
    }

    async loadProjectDetails() {
        try {
            console.log('🔄 Loading project details for ID:', this.projectId);
            console.log('🔄 Making API call to:', `${apiClient.baseURL}/projects/${this.projectId}`);
            
            this.currentProject = await apiClient.get(`/projects/${this.projectId}`);
            this.project = this.currentProject; // Alias for easier access
            
            console.log('✅ Project loaded successfully:', this.currentProject);
            console.log('✅ Project name:', this.currentProject?.name);
            console.log('✅ Project members count:', this.currentProject?.members?.length || this.currentProject?.projectMembers?.length || 0);
            
            console.log('🔄 About to update UI...');
            this.updateProjectUI(this.currentProject);
            console.log('✅ UI updated successfully');
            
            // Load tab data
            console.log('🔄 About to load tab data...');
            this.loadTasks();
            this.loadMembers();
            this.loadFiles();
            this.loadActivity();
            console.log('✅ Tab data loading initiated');
        } catch (error) {
            console.error('❌ Failed to load project details');
            console.error('❌ Error object:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error stack:', error.stack);
            
            if (error.message && error.message.includes('Unauthorized')) {
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                window.location.href = 'auth.html';
            } else {
                alert('Không thể tải thông tin dự án: ' + error.message);
            }
        }
    }

    updateProjectUI(project) {
        try {
            console.log('🔄 Updating project UI with data:', project);
            
            // Safely update each element
            const projectName = document.getElementById('projectName');
            if (projectName) {
                projectName.textContent = project.name || 'Unknown Project';
                console.log('✅ Updated project name:', project.name);
            } else {
                console.warn('⚠️ projectName element not found');
            }
            
            const projectDescription = document.getElementById('projectDescription');
            if (projectDescription) {
                projectDescription.textContent = project.description || 'No description';
            } else {
                console.warn('⚠️ projectDescription element not found');
            }
            
            const projectStartDate = document.getElementById('projectStartDate');
            if (projectStartDate) {
                projectStartDate.textContent = this.formatDate(project.startDate);
            } else {
                console.warn('⚠️ projectStartDate element not found');
            }
            
            const projectEndDate = document.getElementById('projectEndDate');
            if (projectEndDate) {
                projectEndDate.textContent = this.formatDate(project.endDate);
            } else {
                console.warn('⚠️ projectEndDate element not found');
            }
            
            const projectStatus = document.getElementById('projectStatus');
            if (projectStatus) {
                projectStatus.textContent = this.getStatusText(project.status);
                projectStatus.className = `meta-value status-badge ${project.status}`;
            } else {
                console.warn('⚠️ projectStatus element not found');
            }
            
            const projectProgressText = document.getElementById('projectProgressText');
            if (projectProgressText) {
                projectProgressText.textContent = (project.progress || 0) + '%';
            } else {
                console.warn('⚠️ projectProgressText element not found');
            }
            
            const projectProgressBar = document.getElementById('projectProgressBar');
            if (projectProgressBar) {
                projectProgressBar.style.width = (project.progress || 0) + '%';
            } else {
                console.warn('⚠️ projectProgressBar element not found');
            }
            
            console.log('✅ Project UI updated successfully');
        } catch (error) {
            console.error('❌ Error updating project UI:', error);
            console.error('❌ Project data:', project);
        }
    }

    checkUserPermissions() {
        console.log('🔍 Starting permission check...');
        console.log('🔍 Current project:', this.currentProject);
        console.log('🔍 Current user:', this.currentUser);
        
        if (!this.currentProject || !this.currentUser) {
            console.log('❌ Missing project or user data, skipping permission check');
            return;
        }
        
        // Get members from project
        const members = this.currentProject.members || this.currentProject.projectMembers || [];
        console.log('🔍 Project members:', members);
        console.log('🔍 Members count:', members.length);
        
        // Find current user in project members
        console.log('🔍 Looking for current user in members...');
        console.log('🔍 Current user email:', this.currentUser.email);
        console.log('🔍 Current user id:', this.currentUser.id);
        
        const currentMember = members.find(m => {
            console.log('🔍 Checking member:', m);
            const emailMatch = m.email === this.currentUser.email || m.userEmail === this.currentUser.email;
            const idMatch = m.id === this.currentUser.id || m.userId === this.currentUser.id;
            console.log('🔍 Email match:', emailMatch, 'm.email:', m.email, 'm.userEmail:', m.userEmail);
            console.log('🔍 ID match:', idMatch, 'm.id:', m.id, 'm.userId:', m.userId);
            return emailMatch || idMatch;
        });
        
        console.log('🔍 Found current member:', currentMember);
        
        if (currentMember) {
            console.log('🔍 Current member role:', currentMember.role);
            
            if (currentMember.role === 'LEADER' || currentMember.role === 'VICE_LEADER') {
                console.log('✅ User has admin rights, showing settings tab');
                
                // Show settings tab and invite buttons for LEADER and VICE_LEADER
                const settingsTab = document.getElementById('settingsTabBtn');
                console.log('🔍 Settings tab element:', settingsTab);
                
                if (settingsTab) {
                    settingsTab.style.display = 'block';
                    console.log('✅ Settings tab shown');
                } else {
                    console.log('❌ Settings tab element not found');
                }
                
                this.showInviteMemberButtons();
                console.log('✅ Invite buttons shown');
            } else {
                console.log('❌ User does not have admin rights, role:', currentMember.role);
                this.hideInviteMemberButtons();
            }
        } else {
            console.log('❌ Current user not found in project members');
            this.hideInviteMemberButtons();
        }
    }
    
    showInviteMemberButtons() {
        const inviteButtons = document.querySelectorAll('button[onclick="inviteMember()"]');
        inviteButtons.forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }
    
    hideInviteMemberButtons() {
        const inviteButtons = document.querySelectorAll('button[onclick="inviteMember()"]');
        inviteButtons.forEach(btn => {
            btn.style.display = 'none';
        });
    }

    async loadTasks() {
        try {
            const tasks = await apiClient.get(`/tasks`, { projectId: this.projectId });
            this.displayTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('tasksList', 'Không thể tải danh sách nhiệm vụ');
        }
    }

    displayTasks(tasks) {
        const tasksList = document.getElementById('tasksList');
        
        if (!tasks || tasks.length === 0) {
            tasksList.innerHTML = this.getEmptyState('check2-square', 'Chưa có nhiệm vụ', 'Tạo nhiệm vụ đầu tiên cho dự án');
            return;
        }
        
        const tasksHTML = tasks.map(task => `
            <div class="task-item" onclick="viewTask(${task.id})">
                <div class="task-header">
                    <h6 class="task-title">${this.escapeHtml(task.title || 'Untitled Task')}</h6>
                    <span class="task-priority priority-${this.getPriorityClass(task.priority || 1)}">${this.getPriorityText(task.priority || 1)}</span>
                </div>
                <p class="task-description">${this.escapeHtml(task.description || 'Không có mô tả')}</p>
                <div class="task-meta">
                    <span><i class="bi bi-calendar me-1"></i>${this.formatDate(task.deadline)}</span>
                    <span><i class="bi bi-person me-1"></i>${task.assignedUsers ? task.assignedUsers.length : 0} người</span>
                    <span><i class="bi bi-bar-chart me-1"></i>${task.progress || 0}%</span>
                    <span class="task-status status-${task.status ? task.status.toLowerCase() : 'unknown'}">${this.getTaskStatusText(task.status)}</span>
                </div>
            </div>
        `).join('');
        
        tasksList.innerHTML = tasksHTML;
    }

    loadMembers() {
        if (!this.currentProject) {
            this.showError('membersList', 'Không thể tải danh sách thành viên');
            return;
        }
        // Get members from project and store in this.members for activity usage
        const members = this.currentProject.members || this.currentProject.projectMembers || [];
        this.members = members; // Store for activity user lookup
        const membersList = document.getElementById('membersList');
        const sortedMembers = this.sortMembersByRole(members);
        const membersHTML = sortedMembers.map(member => `
            <div class="member-card" onclick="viewMemberById('${member.id}')">
                <div class="member-info">
                    <div class="member-avatar">${this.getInitials(member.firstName || member.name || '', member.lastName || '')}</div>
                    <div class="member-details">
                        <h5>${this.escapeHtml(member.firstName || member.name || 'Unknown')} ${this.escapeHtml(member.lastName || '')}</h5>
                        <div class="member-role">${this.getRoleText(member.role)}</div>
                        <div class="member-email">${this.escapeHtml(member.email || member.userEmail || 'No email')}</div>
                    </div>
                </div>
                ${this.canManageMember(member) ? `
                    <button class="member-options-btn" onclick="event.stopPropagation(); showMemberOptions('${member.id}', '${member.role}')">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
        membersList.innerHTML = membersHTML;
    }

    canManageMember(member) {
        if (!this.currentUser || !this.currentProject) return false;
        
        const currentMember = this.currentProject.members.find(m => m.email === this.currentUser.email);
        if (!currentMember) return false;
        
        // Leaders can manage everyone except themselves
        if (currentMember.role === 'LEADER' && member.email !== this.currentUser.email) {
            return true;
        }
        
        // Vice leaders can only remove members
        if (currentMember.role === 'VICE_LEADER' && member.role === 'MEMBER') {
            return true;
        }
        
        return false;
    }

    async loadFiles() {
        try {
            const files = await apiClient.get(`/files/project/${this.projectId}`);
            this.displayFiles(files);
        } catch (error) {
            console.error('Error loading files:', error);
            this.showError('filesList', 'Không thể tải danh sách tệp tin');
        }
    }

    displayFiles(files) {
        const filesList = document.getElementById('filesList');
        
        if (!files || files.length === 0) {
            filesList.innerHTML = this.getEmptyState('folder', 'Chưa có tệp tin', 'Tải lên tệp tin đầu tiên cho dự án');
            return;
        }
        
        const filesHTML = files.map(file => `
            <div class="file-item">
                <div class="file-content" onclick="downloadFile(${file.id})">
                    <i class="bi ${this.getFileIcon(file.type)} file-icon"></i>
                    <div class="file-info">
                        <h6>${this.escapeHtml(file.name)}</h6>
                        <small>${file.type ? file.type.toUpperCase() : 'Unknown'}</small>
                        <div class="file-meta">
                            <span class="file-size">${this.formatFileSize(file.size || 0)}</span>
                            <span class="file-date">${this.formatDate(file.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="downloadFile(${file.id})" title="Tải xuống">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFile(${file.id}, '${this.escapeHtml(file.name)}')" title="Xóa">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        filesList.innerHTML = filesHTML;
    }

    async loadActivity() {
        try {
            const activities = await apiClient.get('/user-activity', { projectId: this.projectId });
            console.log('🔄 Loaded activities:', activities);
            await this.displayActivity(activities);
        } catch (error) {
            console.error('Error loading activity:', error);
            this.showError('activityList', 'Không thể tải hoạt động dự án');
        }
    }

    async displayActivity(activities) {
        const activityList = document.getElementById('activityList');
        
        if (!activities || activities.length === 0) {
            activityList.innerHTML = this.getEmptyState('activity', 'Chưa có hoạt động', 'Hoạt động sẽ hiển thị khi có thành viên thực hiện các hành động');
            return;
        }
        
        // Show loading while fetching user data
        activityList.innerHTML = '<div class="loading-spinner"><div class="spinner-border" role="status"><span class="visually-hidden">Đang tải thông tin người dùng...</span></div></div>';
        
        // Process activities with user data
        const activitiesWithUsers = await Promise.all(activities.map(async (activity) => {
            const userHtml = await this.getActivityUser(activity);
            return {
                ...activity,
                userHtml
            };
        }));
        
        const activitiesHTML = activitiesWithUsers.map(activity => `
            <div class="activity-item">
                <div class="activity-header">
                    <div class="activity-main">
                        <span class="activity-action">
                            <span class="activity-user">${activity.userHtml}</span>
                            ${this.getActionText(activity.action)}
                            <span class="activity-project">trong dự án <strong class="clickable" onclick="redirectToProject(${this.project?.id})">${this.project?.name || 'Dự án'}</strong></span>
                        </span>
                        <span class="activity-time">${this.formatRelativeTime(activity.timestamp)}</span>
                    </div>
                </div>
                <div class="activity-details">
                    ${this.getActivityDetails(activity)}
                </div>
            </div>
        `).join('');
        
        activityList.innerHTML = activitiesHTML;
    }

    // Helper Functions
    formatDate(timestamp) {
        if (!timestamp) return '--';
        return new Date(timestamp).toLocaleDateString('vi-VN');
    }

    formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) {
            return 'vừa xong';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} phút trước`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} giờ trước`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ngày trước`;
        } else {
            // For older than 30 days, show actual date
            return time.toLocaleDateString('vi-VN');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    getStatusText(status) {
        const statusMap = {
            'NOT_STARTED': 'Chưa bắt đầu',
            'IN_PROGRESS': 'Đang thực hiện',
            'COMPLETED': 'Hoàn thành',
            'ON_HOLD': 'Tạm dừng',
            'CANCELED': 'Đã huỷ'
        };
        return statusMap[status] || status;
    }

    getTaskStatusText(status) {
        const statusMap = {
            'NOT_STARTED': 'Chưa bắt đầu',
            'IN_PROGRESS': 'Đang thực hiện', 
            'COMPLETED': 'Hoàn thành',
            'OVERDUE': 'Quá hạn',
            'CANCELLED': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    getPriorityClass(priority) {
        if (priority <= 1) return 'low';
        if (priority <= 2) return 'medium';
        return 'high';
    }

    getPriorityText(priority) {
        if (priority <= 1) return 'Thấp';
        if (priority <= 2) return 'Trung bình';
        return 'Cao';
    }

    getInitials(firstName, lastName) {
        return (firstName?.[0] || '') + (lastName?.[0] || '');
    }

    getRoleText(role) {
        const roleMap = {
            'LEADER': 'Trưởng nhóm',
            'VICE_LEADER': 'Phó nhóm',
            'MEMBER': 'Thành viên'
        };
        return roleMap[role] || role;
    }

    sortMembersByRole(members) {
        const roleOrder = { 'LEADER': 1, 'VICE_LEADER': 2, 'MEMBER': 3 };
        return members.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    }

    getFileIcon(type) {
        if (!type) return 'bi-file-earmark';
        
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
        return iconMap[type.toLowerCase()] || 'bi-file-earmark';
    }

    getActionText(action) {
        const actionMap = {
            'created_task': 'đã tạo nhiệm vụ',
            'updated_project': 'đã cập nhật dự án',
            'completed_task': 'đã hoàn thành nhiệm vụ',
            'joined_project': 'đã tham gia dự án',
            'uploaded_file': 'đã tải lên tệp tin',
            'created_comment': 'đã bình luận'
        };
        return actionMap[action] || action;
    }

    async fetchUserData(userId) {
        // Check cache first
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }

        try {
            console.log(`🔄 Fetching user data for ID: ${userId}`);
            const userData = await apiClient.get(`/users/${userId}`);
            
            // Cache the result
            this.userCache.set(userId, userData);
            console.log(`✅ User data cached for ID: ${userId}`, userData);
            
            return userData;
        } catch (error) {
            console.error(`❌ Failed to fetch user data for ID: ${userId}`, error);
            
            // Create fallback user data
            const fallbackUser = {
                id: userId,
                firstName: `Người dùng`,
                lastName: `#${userId}`,
                fullName: `Người dùng #${userId}`,
                username: `user_${userId}`,
                email: null
            };
            
            // Cache the fallback to avoid repeated failed requests
            this.userCache.set(userId, fallbackUser);
            return fallbackUser;
        }
    }

    async getActivityUser(activity) {
        if (!activity.userId) {
            return `<strong class="user-name">Người dùng không xác định</strong>`;
        }

        try {
            const userData = await this.fetchUserData(activity.userId);
            
            if (userData) {
                // Priority: firstName + lastName > fullName > username > email
                let displayName = '';
                if (userData.firstName && userData.lastName) {
                    displayName = `${userData.firstName} ${userData.lastName}`.trim();
                } else if (userData.firstName) {
                    displayName = userData.firstName;
                } else if (userData.fullName) {
                    displayName = userData.fullName;
                } else if (userData.username) {
                    displayName = userData.username;
                } else if (userData.email) {
                    displayName = userData.email;
                } else {
                    displayName = `User #${userData.id}`;
                }
                
                // Make user name clickable
                return `<strong class="user-name clickable" onclick="redirectToUser(${userData.id})">${this.escapeHtml(displayName)}</strong>`;
            } else {
                return `<strong class="user-name">Người dùng #${activity.userId}</strong>`;
            }
        } catch (error) {
            console.error('Error getting activity user:', error);
            return `<strong class="user-name">Người dùng #${activity.userId}</strong>`;
        }
    }

    getActivityDetails(activity) {
        if (!activity.targetType || !activity.targetId) {
            return '';
        }
        
        const targetType = activity.targetType.toLowerCase();
        const targetId = activity.targetId;
        
        // Create clickable links based on target type
        switch (targetType) {
            case 'task':
                return `<span class="activity-target clickable" onclick="redirectToTask(${targetId})">
                    <i class="bi bi-check-square"></i> Nhiệm vụ #${targetId}
                </span>`;
                
            case 'project':
                return `<span class="activity-target clickable" onclick="redirectToProject(${targetId})">
                    <i class="bi bi-folder"></i> Dự án #${targetId}
                </span>`;
                
            case 'member':
            case 'user':
                return `<span class="activity-target clickable" onclick="redirectToUser(${targetId})">
                    <i class="bi bi-person"></i> Thành viên #${targetId}
                </span>`;
                
            case 'file':
                return `<span class="activity-target">
                    <i class="bi bi-file-earmark"></i> File #${targetId}
                </span>`;
                
            case 'comment':
                return `<span class="activity-target">
                    <i class="bi bi-chat"></i> Bình luận #${targetId}
                </span>`;
                
            default:
                return `<span class="activity-target">
                    <i class="bi bi-info-circle"></i> ${activity.targetType} #${targetId}
                </span>`;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(containerId, message) {
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <h5>Có lỗi xảy ra</h5>
                <p>${message}</p>
            </div>
        `;
    }

    getEmptyState(icon, title, description) {
        return `
            <div class="empty-state">
                <i class="bi bi-${icon}"></i>
                <h5>${title}</h5>
                <p>${description}</p>
            </div>
        `;
    }

    // Member Management
    showMemberOptions(memberId, memberRole) {

        console.log("show member options");

        this.selectedMemberId = memberId;
        console.log(memberId);
        // Configure modal buttons based on current user's role
        const currentMember = this.currentProject.members.find(m => m.email === this.currentUser.email);
        console.log(this.currentProject);
        const promoteViceBtn = document.getElementById('promoteViceBtn');
        const promoteLeaderBtn = document.getElementById('promoteLeaderBtn');
        const removeBtn = document.getElementById('removeBtn');
        if (currentMember.role === 'LEADER') {
            promoteViceBtn.style.display = memberRole === 'MEMBER' ? 'block' : 'none';
            promoteLeaderBtn.style.display = memberRole !== 'LEADER' ? 'block' : 'none';
            removeBtn.style.display = 'block';
        } else if (currentMember.role === 'VICE_LEADER') {
            promoteViceBtn.style.display = 'none';
            promoteLeaderBtn.style.display = 'none';
            removeBtn.style.display = memberRole === 'MEMBER' ? 'block' : 'none';
        }
        const modal = new bootstrap.Modal(document.getElementById('memberOptionsModal'));
        modal.show();
    }

    async promoteTo(newRole) {
        try {
            // Đúng endpoint: PATCH /projects/{projectId}/promote-vice-leader?memberId=... hoặc /change-leader?newLeaderId=...
            if (newRole === 'LEADER') {
                await this.promoteToLeader(this.selectedMemberId);
            } else if (newRole === 'VICE_LEADER') {
                await this.promoteToViceLeader(this.selectedMemberId);
            } else if (newRole === 'MEMBER') {
                await this.demoteViceLeader(this.selectedMemberId);
            }
            // Đóng modal sẽ được thực hiện trong các hàm trên
        } catch (error) {
            console.error('Error promoting member:', error);
            alert('Không thể cập nhật vai trò thành viên');
        }
    }

    async removeMemberById(memberId, memberRole) {
        // Chỉ LEADER hoặc VICE_LEADER được xoá MEMBER, chỉ LEADER được xoá VICE_LEADER
        const currentMember = this.currentProject.members.find(m => m.id === this.currentUser.id);
        if (!currentMember) return;
        if (memberRole === 'MEMBER' && (currentMember.role === 'LEADER' || currentMember.role === 'VICE_LEADER')) {
            // allowed
        } else if (memberRole === 'VICE_LEADER' && currentMember.role === 'LEADER') {
            // allowed
        } else {
            alert('Bạn không có quyền xoá thành viên này!');
            return;
        }
        if (!confirm('Bạn có chắc chắn muốn xoá thành viên này khỏi dự án?')) return;
        try {
            const res = await apiClient.patch(`/projects/${this.projectId}/remove-member?memberId=${memberId}`);
            this.currentProject.members = res;
            this.loadMembers();
            this.switchToMembersTab();
            // Đóng modal sau khi thao tác thành công
            const modal = bootstrap.Modal.getInstance(document.getElementById('memberOptionsModal'));
            if (modal) modal.hide();
        } catch (e) {
            alert('Không thể xoá thành viên: ' + (e?.message || ''));
        }
    }

    async promoteToLeader(memberId) {
        // Chỉ LEADER được phép
        const currentMember = this.currentProject.members.find(m => m.id === this.currentUser.id);
        if (!currentMember || currentMember.role !== 'LEADER') {
            alert('Chỉ trưởng nhóm mới có quyền này!');
            return;
        }
        if (!confirm('Bạn có chắc muốn chuyển quyền trưởng nhóm cho thành viên này?')) return;
        try {
            const res = await apiClient.patch(`/projects/${this.projectId}/change-leader?newLeaderId=${memberId}`);
            this.currentProject.members = res;
            this.loadMembers();
            this.switchToMembersTab();
            // Đóng modal sau khi thao tác thành công
            const modal = bootstrap.Modal.getInstance(document.getElementById('memberOptionsModal'));
            if (modal) modal.hide();
        } catch (e) {
            alert('Không thể chuyển quyền trưởng nhóm: ' + (e?.message || ''));
        }
    }

    async promoteToViceLeader(memberId) {
        // Chỉ LEADER được phép
        const currentMember = this.currentProject.members.find(m => m.id === this.currentUser.id);
        if (!currentMember || currentMember.role !== 'LEADER') {
            alert('Chỉ trưởng nhóm mới có quyền này!');
            return;
        }
        try {
            const res = await apiClient.patch(`/projects/${this.projectId}/promote-vice-leader?memberId=${memberId}`);
            this.currentProject.members = res;
            this.loadMembers();
            this.switchToMembersTab();
            // Đóng modal sau khi thao tác thành công
            const modal = bootstrap.Modal.getInstance(document.getElementById('memberOptionsModal'));
            if (modal) modal.hide();
        } catch (e) {
            alert('Không thể nâng lên phó nhóm: ' + (e?.message || ''));
        }
    }

    async demoteViceLeader(memberId) {
        // Chỉ LEADER được phép
        const currentMember = this.currentProject.members.find(m => m.id === this.currentUser.id);
        if (!currentMember || currentMember.role !== 'LEADER') {
            alert('Chỉ trưởng nhóm mới có quyền này!');
            return;
        }
        try {
            const res = await apiClient.patch(`/projects/${this.projectId}/demote-vice-leader?memberId=${memberId}`);
            this.currentProject.members = res;
            this.loadMembers();
            this.switchToMembersTab();
            // Đóng modal sau khi thao tác thành công
            const modal = bootstrap.Modal.getInstance(document.getElementById('memberOptionsModal'));
            if (modal) modal.hide();
        } catch (e) {
            alert('Không thể hạ chức phó nhóm: ' + (e?.message || ''));
        }
    }

    switchToMembersTab() {
        // Chuyển sang tab thành viên
        const tabBtn = document.querySelector('#membersTabBtn, [data-bs-target="#membersTab"]');
        const tabPane = document.getElementById('membersTab');
        if (tabBtn) tabBtn.click();
        if (tabPane) {
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tabPane.classList.add('active');
        }
    }
}

// Tab Management
function showTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Task Management
function toggleTaskChildren(taskId) {
    const childrenDiv = document.getElementById(`children-${taskId}`);
    const expandBtn = document.getElementById(`expand-${taskId}`);
    const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
    
    if (childrenDiv.classList.contains('expanded')) {
        // Collapse
        childrenDiv.classList.remove('expanded');
        expandBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        expandBtn.classList.remove('expanded');
        taskItem.classList.remove('expanded');
    } else {
        // Expand
        childrenDiv.classList.add('expanded');
        expandBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        expandBtn.classList.add('expanded');
        taskItem.classList.add('expanded');
    }
}

// Navigation Functions
function createTask() {
    const projectId = new URLSearchParams(window.location.search).get('id');
    window.location.href = `create-task.html?projectId=${projectId}`;
}

function viewTask(taskId) {
    window.location.href = `task-details.html?id=${taskId}`;
}

function viewMemberById(memberId) {
    const projectId = new URLSearchParams(window.location.search).get('id');
    window.location.href = `project-member.html?memberId=${encodeURIComponent(memberId)}&projectId=${projectId}`;
}

function inviteMember() {
    // Show invite code modal when clicking invite member button
    getInviteCode();
}

function uploadFile() {
    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        alert('Không tìm thấy thông tin dự án');
        return;
    }
    
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif';
    
    fileInput.onchange = async function(event) {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }
        
        // Show progress
        const uploadButton = document.querySelector('button[onclick="uploadFile()"]');
        const originalText = uploadButton ? uploadButton.innerHTML : '';
        if (uploadButton) {
            uploadButton.innerHTML = '<i class="bi bi-upload"></i> Đang tải lên...';
            uploadButton.disabled = true;
        }
        
        try {
            const formData = new FormData();
            
            // Add files to FormData
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            
            // Add project ID
            formData.append('projectId', projectId);
            
            console.log('🔄 Uploading files to project:', projectId);
            
            const response = await fetch(`${apiClient.baseURL}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Upload result:', result);
            
            if (result.totalUploaded > 0) {
                alert(`Đã tải lên thành công ${result.totalUploaded} tệp tin!`);
                
                // Reload files list
                if (projectDetailsManager) {
                    projectDetailsManager.loadFiles();
                }
            }
            
            if (result.errors && result.errors.length > 0) {
                console.warn('Upload errors:', result.errors);
                alert('Một số tệp tin không thể tải lên:\n' + result.errors.join('\n'));
            }
            
        } catch (error) {
            console.error('❌ Upload failed:', error);
            alert('Không thể tải lên tệp tin: ' + error.message);
        } finally {
            // Restore button
            if (uploadButton) {
                uploadButton.innerHTML = originalText || '<i class="bi bi-upload"></i> Tải lên tệp tin';
                uploadButton.disabled = false;
            }
        }
    };
    
    // Trigger file selection
    fileInput.click();
}

function downloadFile(fileId) {
    window.open(`/api/files/download/${fileId}`, '_blank');
}

// Delete file function
async function deleteFile(fileId, fileName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa tệp tin "${fileName}"?`)) {
        return;
    }
    
    try {
        console.log('🔄 Deleting file:', fileId);
        
        const response = await apiClient.delete(`/files/${fileId}`);
        
        console.log('✅ File deleted successfully');
        alert('Đã xóa tệp tin thành công!');
        
        // Reload files list
        if (projectDetailsManager) {
            projectDetailsManager.loadFiles();
        }
        
    } catch (error) {
        console.error('❌ Failed to delete file:', error);
        alert('Không thể xóa tệp tin: ' + error.message);
    }
}

// Settings Functions
function editProject() {
    const projectId = new URLSearchParams(window.location.search).get('id');
    window.location.href = `edit-project.html?id=${projectId}`;
}

function managePermissions() {
    alert('Chức năng quản lý quyền sẽ được phát triển');
}

function deleteProject() {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    if (!confirm('Xác nhận lần cuối: Xóa dự án sẽ xóa tất cả dữ liệu liên quan. Tiếp tục?')) {
        return;
    }
    
    // TODO: Implement delete project
    alert('Chức năng xóa dự án sẽ được phát triển');
}

// Global Functions for Modal Actions
function promoteTo(newRole) {
    projectDetailsManager.promoteTo(newRole);
}

function removeMember() {
    // Lấy memberId và memberRole từ modal hoặc projectDetailsManager.selectedMemberId
    if (!projectDetailsManager || !projectDetailsManager.selectedMemberId) return;
    // Tìm memberRole
    let memberRole = null;
    if (projectDetailsManager.currentProject && projectDetailsManager.currentProject.members) {
        const m = projectDetailsManager.currentProject.members.find(mem => (mem.email === projectDetailsManager.selectedMemberId || mem.userEmail === projectDetailsManager.selectedMemberId));
        if (m) memberRole = m.role;
    }
    if (!memberRole) memberRole = 'MEMBER'; // fallback
    projectDetailsManager.removeMemberById(projectDetailsManager.selectedMemberId, memberRole);
}

// Global functions for member actions
function removeMemberById(memberId, memberRole) {
    if (projectDetailsManager) projectDetailsManager.removeMemberById(memberId, memberRole);
}
function promoteToLeader(memberId) {
    if (projectDetailsManager) projectDetailsManager.promoteToLeader(memberId);
}
function promoteToViceLeader(memberId) {
    if (projectDetailsManager) projectDetailsManager.promoteToViceLeader(memberId);
}
function demoteViceLeader(memberId) {
    if (projectDetailsManager) projectDetailsManager.demoteViceLeader(memberId);
}

// User Profile Functions
async function viewProfile() {
    window.location.href = 'profile.html';
}

async function editProfile() {
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

// Notification Functions
async function markNotificationAsRead(notificationId) {
    try {
        await apiClient.put(`/notifications/${notificationId}/read`);
        await projectDetailsManager.loadNotifications();
    } catch (error) {
        console.warn('Failed to mark notification as read:', error);
    }
}

async function markAllAsRead() {
    try {
        await apiClient.put('/notifications/read-all');
        await projectDetailsManager.loadNotifications();
    } catch (error) {
        console.warn('Failed to mark all notifications as read:', error);
    }
}

// Sidebar Toggle (if needed)
function toggleSidebar() {
    // TODO: Implement sidebar functionality if needed
}

// Initialize when DOM is loaded
let projectDetailsManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM loaded, initializing Project Details Manager...');
    
    // Prevent multiple managers
    if (projectDetailsManager) {
        console.warn('⚠️ ProjectDetailsManager already exists, skipping...');
        return;
    }
    
    try {
        projectDetailsManager = new ProjectDetailsManager();
        console.log('✅ ProjectDetailsManager created successfully');
    } catch (error) {
        console.error('❌ Error creating ProjectDetailsManager:', error);
    }
});

// Helper function to get project ID from URL
function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Invite Code Functions
async function getInviteCode() {
    try {
        const projectId = getProjectIdFromUrl();
        
        if (!projectId) {
            alert('Không tìm thấy thông tin dự án');
            return;
        }

        const response = await apiClient.post(`/invites/generate?projectId=${projectId}`);
        
        // Backend returns invite object with {id, code, projectId, createdAt, expiresAt}
        if (response && response.code) {
            const inviteCode = response.code;
            document.getElementById('inviteCodeInput').value = inviteCode;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('inviteCodeModal'));
            modal.show();
            
            // alert('Mã mời đã được tạo thành công!');
        } else {
            throw new Error('Không thể tạo mã mời');
        }

    } catch (error) {
        console.error('Error generating invite code:', error);
        
        if (error.message && error.message.includes('Unauthorized')) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = 'auth.html';
        } else {
            alert('Có lỗi xảy ra khi tạo mã mời: ' + error.message);
        }
    }
}

function copyInviteCode() {
    const input = document.getElementById('inviteCodeInput');
    const code = input.value;
    
    if (!code) {
        alert('Không có mã để sao chép');
        return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        alert('Đã sao chép mã mời!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Không thể sao chép mã');
    });
}

async function generateNewCode() {
    const confirmNew = confirm('Bạn có chắc muốn tạo mã mời mới? Mã cũ sẽ không còn sử dụng được.');
    if (confirmNew) {
        await getInviteCode();
    }
}

// Activity redirect functions
function redirectToUser(userId) {
    if (!userId) {
        console.warn('Invalid user ID for redirect');
        return;
    }
    
    console.log('Redirecting to user profile:', userId);
    // For now, redirect to profile page with user parameter
    window.location.href = `profile.html?userId=${userId}`;
}

function redirectToTask(taskId) {
    if (!taskId) {
        console.warn('Invalid task ID for redirect');
        return;
    }
    
    console.log('Redirecting to task details:', taskId);
    window.location.href = `task-details.html?id=${taskId}`;
}

function redirectToProject(projectId) {
    if (!projectId) {
        console.warn('Invalid project ID for redirect');
        return;
    }
    
    console.log('Redirecting to project details:', projectId);
    window.location.href = `project-details.html?id=${projectId}`;
}

// === Project Status Edit ===
document.addEventListener('DOMContentLoaded', function () {
    const statusForm = document.getElementById('projectStatusForm');
    const statusSelect = document.getElementById('editProjectStatus');
    const alertBox = document.getElementById('projectStatusAlert');
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!statusForm || !statusSelect || !projectId) return;

    // Only allow these statuses
    const allowedStatuses = ['IN_PROGRESS', 'ON_HOLD', 'CANCELED'];
    statusSelect.innerHTML = `
        <option value="IN_PROGRESS">Đang thực hiện</option>
        <option value="ON_HOLD">Tạm dừng</option>
        <option value="CANCELED">Đã huỷ</option>
    `;

    // Load current status
    apiClient.get(`/projects/${projectId}`)
        .then(project => {
            if (project && allowedStatuses.includes(project.status)) {
                statusSelect.value = project.status;
            }
        });

    statusForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const newStatus = statusSelect.value;
        if (!allowedStatuses.includes(newStatus)) {
            showStatusAlert('Trạng thái không hợp lệ!', 'danger');
            return;
        }
        try {
            // Gọi trực tiếp fetch và dùng handleResponseNoBody
            const response = await fetch(`${apiClient.baseURL}/projects/${projectId}/status?status=${encodeURIComponent(newStatus)}`, {
                method: 'PATCH',
                headers: apiClient.getHeaders(),
            });
            await apiClient.handleResponseNoBody(response);
            showStatusAlert('Cập nhật trạng thái thành công!', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            showStatusAlert('Cập nhật trạng thái thất bại! ' + (err?.message || ''), 'danger');
        }
    });

    function showStatusAlert(msg, type) {
        alertBox.textContent = msg;
        alertBox.className = `alert alert-${type} mt-2`;
        alertBox.classList.remove('d-none');
    }
});

// === Add Members Modal Integration ===
document.addEventListener('DOMContentLoaded', function () {
    const openBtn = document.getElementById('openAddMembersModalBtn');
    if (openBtn) {
        openBtn.style.display = 'inline-block';
        openBtn.addEventListener('click', function () {
            const modal = new bootstrap.Modal(document.getElementById('addMembersModal'));
            modal.show();
            // Cập nhật danh sách email thành viên hiện tại mỗi lần mở modal
            if (window.addMembersModalInstance && projectDetailsManager && projectDetailsManager.currentProject) {
                const members = projectDetailsManager.currentProject.members || projectDetailsManager.currentProject.projectMembers || [];
                const emails = members.map(m => m.email || m.userEmail).filter(Boolean);
                window.addMembersModalInstance.setExistingMemberEmails(emails);
            }
        });
    }
    function getCurrentMemberEmails() {
        if (projectDetailsManager && projectDetailsManager.currentProject) {
            const members = projectDetailsManager.currentProject.members || projectDetailsManager.currentProject.projectMembers || [];
            return members.map(m => m.email || m.userEmail).filter(Boolean);
        }
        return [];
    }
    if (typeof AddMembersModal !== 'undefined') {
        window.addMembersModalInstance = new AddMembersModal({
            modalId: 'addMembersModal',
            inputId: 'addMembersInput',
            dropdownId: 'addMembersDropdown',
            selectedListId: 'selectedMembersList',
            submitBtnId: 'addMembersSubmitBtn',
            projectId: getProjectIdFromUrl(),
            onSuccess: function () {
                if (projectDetailsManager) projectDetailsManager.loadMembers();
            },
            existingMemberEmails: getCurrentMemberEmails()
        });
    } else {
        // Fallback: load script dynamically if needed
        const script = document.createElement('script');
        script.src = 'js/add-members-modal.js';
        script.onload = function () {
            window.addMembersModalInstance = new AddMembersModal({
                modalId: 'addMembersModal',
                inputId: 'addMembersInput',
                dropdownId: 'addMembersDropdown',
                selectedListId: 'selectedMembersList',
                submitBtnId: 'addMembersSubmitBtn',
                projectId: getProjectIdFromUrl(),
                onSuccess: function () {
                    if (projectDetailsManager) projectDetailsManager.loadMembers();
                },
                existingMemberEmails: getCurrentMemberEmails()
            });
        };
        document.body.appendChild(script);
    }
});

function showMemberOptions(memberId, memberRole) {
    projectDetailsManager.showMemberOptions(memberId, memberRole);
}
window.showMemberOptions = showMemberOptions;
