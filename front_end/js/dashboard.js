// Dashboard JavaScript

class DashboardManager {
    constructor() {
        console.log('=== DashboardManager Constructor ===');
        this.sidebarExpanded = true;
        this.init();
    }

    init() {
        console.log('=== DashboardManager Init ===');
        console.log('Document ready state:', document.readyState);
        
        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            console.log('DOM is still loading, adding event listener');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('=== DOM Content Loaded (via event) ===');
                this.initializeApp();
            });
        } else {
            console.log('DOM already loaded, initializing immediately');
            this.initializeApp();
        }
    }

    initializeApp() {
        console.log('=== Initialize App ===');
        if (!authUtils.isAuthenticated()) {
            console.log('User not authenticated, redirecting to auth page');
            window.location.href = '/front_end/auth.html';
            return;
        }
        
        console.log('User authenticated, loading dashboard');
        // Load user information
        this.loadUserInfo();
        
        // Initialize notification service
        this.initializeNotificationService();
        
        // Load dashboard data
        this.loadDashboardData();
        
        // Setup responsive handler
        this.setupResponsiveHandler();
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

    loadUserInfo() {
        const userInfo = authUtils.getUserInfo();
        if (userInfo) {
            const displayName = (userInfo.firstName && userInfo.lastName) ? 
                `${userInfo.firstName} ${userInfo.lastName}` : 
                userInfo.name || userInfo.email || 'Người dùng';
            
            document.getElementById('userDisplayName').textContent = displayName;
            document.getElementById('userEmail').textContent = userInfo.email || 'Không có email';
        }
    }

    async loadDashboardData() {
        console.log('=== Starting loadDashboardData ===');
        try {
            // Load deadline tasks
            console.log('Loading deadline tasks...');
            await this.loadDeadlineTasks();
            
            // Load recent projects
            console.log('Loading recent projects...');
            await this.loadRecentProjects();
            
            // Load recent tasks
            console.log('Loading recent tasks...');
            await this.loadRecentTasks();
            
            console.log('=== Finished loadDashboardData ===');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadDeadlineTasks() {
        try {
            const response = await apiClient.get('/tasks/deadline');
            await this.renderTasks(response, 'deadlineTasks', 'red');
        } catch (error) {
            console.error('Error loading deadline tasks:', error);
            this.showError('deadlineTasks', 'Lỗi khi tải nhiệm vụ gần deadline');
        }
    }

    async loadRecentProjects() {
        console.log('=== Starting loadRecentProjects ===');
        try {
            console.log('Making API call to /projects/recent');
            const response = await apiClient.get('/projects/recent');
            console.log('Recent Projects Response:', response);
            console.log('Response type:', typeof response);
            console.log('Response length:', response?.length);
            this.renderProjects(response, 'recentProjects');
            console.log('=== Finished loadRecentProjects ===');
        } catch (error) {
            console.error('Error loading recent projects:', error);
            this.showError('recentProjects', 'Lỗi khi tải dự án gần đây');
        }
    }

    async loadRecentTasks() {
        try {
            const response = await apiClient.get('/tasks/recent');
            await this.renderTasks(response, 'recentTasks', 'blue');
        } catch (error) {
            console.error('Error loading recent tasks:', error);
            this.showError('recentTasks', 'Lỗi khi tải nhiệm vụ gần đây');
        }
    }

    async renderTasks(tasks, containerId, deadlineColor) {
        const container = document.getElementById(containerId);
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<div class="content-item"><p class="text-muted text-center">Không có nhiệm vụ nào</p></div>';
            return;
        }

        // Limit to 6 items for single row display on desktop
        const limitedTasks = tasks.slice(0, 6);

        // Fetch project data for each task
        const tasksWithProjects = await Promise.all(
            limitedTasks.map(async (task) => {
                let projectName = 'Dự án không xác định';
                if (task.projectId) {
                    try {
                        const project = await apiClient.get(`/projects/${task.projectId}`);
                        projectName = project.name || 'Dự án không tên';
                    } catch (error) {
                        console.error(`Error fetching project ${task.projectId}:`, error);
                    }
                }
                return { ...task, projectName };
            })
        );

        const tasksHtml = tasksWithProjects.map(task => `
            <div class="content-item">
                <div class="task-card" onclick="viewTask(${task.id})">
                    <div class="card-body">
                        <div class="card-subtitle">${task.projectName}</div>
                        <div class="card-title">${task.title || 'Task không có tiêu đề'}</div>
                        <div class="card-description">${task.description || 'Không có mô tả'}</div>
                        <div class="deadline ${deadlineColor}">
                            <i class="bi bi-calendar"></i>
                            Deadline: ${task.deadline ? this.formatDateTime(task.deadline) : 'Chưa có deadline'}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = tasksHtml;
    }

    renderProjects(projects, containerId) {
        const container = document.getElementById(containerId);
        
        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="content-item"><p class="text-muted text-center">Không có dự án nào</p></div>';
            return;
        }

        // Limit to 6 items for single row display on desktop
        const limitedProjects = projects.slice(0, 6);

        const projectsHtml = limitedProjects.map(project => {
            // Find team leader
            const leader = project.members?.find(member => 
                member.role === 'LEADER' || member.role === 'leader'
            );
            const leaderName = leader ? 
                `${leader.firstName || ''} ${leader.lastName || ''}`.trim() || leader.email :
                'Chưa có trưởng nhóm';

            // Get project status
            const statusClass = project.status ? project.status.toLowerCase() : 'not_started';
            const statusText = this.getProjectStatusText(project.status);

            return `
                <div class="content-item">
                    <div class="project-card" onclick="viewProject(${project.id})">
                        <div class="card-body">
                            <div class="card-title">${project.name || 'Dự án không tên'}</div>
                            <div class="card-description">${project.description || 'Không có mô tả'}</div>
                            <div class="card-info">
                                <i class="bi bi-person-badge"></i>
                                Trưởng nhóm: ${leaderName}
                            </div>
                            <div class="card-info">
                                <i class="bi bi-calendar-event"></i>
                                Bắt đầu: ${project.startDate ? this.formatDate(project.startDate) : 'Chưa xác định'}
                            </div>
                            <div class="card-info">
                                <i class="bi bi-calendar-check"></i>
                                Kết thúc: ${project.endDate ? this.formatDate(project.endDate) : 'Chưa xác định'}
                            </div>
                            <div class="status-badge ${statusClass}">
                                ${statusText}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = projectsHtml;
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `<div class="content-item"><p class="text-danger text-center">${message}</p></div>`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    }

    getProjectStatusText(status) {
        switch(status?.toUpperCase()) {
            case 'NOT_STARTED':
                return 'Chưa bắt đầu';
            case 'IN_PROGRESS':
                return 'Đang thực hiện';
            case 'COMPLETED':
                return 'Hoàn thành';
            case 'ON_HOLD':
                return 'Tạm dừng';
            case 'CANCELLED':
                return 'Đã hủy';
            default:
                return 'Chưa xác định';
        }
    }

    // Sidebar functions
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        this.sidebarExpanded = !this.sidebarExpanded;
        
        if (this.sidebarExpanded) {
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('expanded');
            mainContent.classList.remove('sidebar-collapsed');
        } else {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        }
    }

    setActiveMenu(element, page) {
        // Remove active class from all menu items
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        element.classList.add('active');
        
        // Handle navigation based on page
        this.handleNavigation(page);
    }

    handleNavigation(page) {
        switch(page) {
            case 'home':
                // Already on home page
                break;
            case 'projects':
                window.location.href = 'projects.html';
                break;
            case 'tasks':
                window.location.href = 'tasks.html';
                break;
            case 'calendar':
                window.location.href = 'calendar.html';
                break;
            default:
                console.log(`Navigate to ${page}`);
        }
    }

    setupResponsiveHandler() {
        // Handle responsive sidebar
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('expanded', 'collapsed');
                document.getElementById('mainContent').classList.remove('sidebar-collapsed');
            } else {
                const sidebar = document.getElementById('sidebar');
                if (this.sidebarExpanded) {
                    sidebar.classList.add('expanded');
                    sidebar.classList.remove('collapsed');
                } else {
                    sidebar.classList.add('collapsed');
                    sidebar.classList.remove('expanded');
                }
            }
        });
    }
}

// Navigation Functions
function viewTask(taskId) {
    window.location.href = `task-details.html?id=${taskId}`;
}

function viewProject(projectId) {
    window.location.href = `project-details.html?id=${projectId}`;
}

// Action functions
function createProject() {
    window.location.href = 'create-project.html';
}

// Note: joinProject() function is provided by join-project-modal.js

// Logout function
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        authUtils.logout();
    }
}

// Global functions for HTML onclick handlers
function toggleSidebar() {
    dashboardManager.toggleSidebar();
}

function setActiveMenu(element, page) {
    dashboardManager.setActiveMenu(element, page);
}

// Initialize dashboard manager
let dashboardManager;

// Initialize immediately when script loads
console.log('=== Script Loading ===');
console.log('Document ready state at script load:', document.readyState);
dashboardManager = new DashboardManager();
