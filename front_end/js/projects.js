/**
 * Projects Page JavaScript
 * Handles project listing, filtering, sorting, and pagination
 */

class ProjectsManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = 12;
        this.totalPages = 0;
        this.totalElements = 0;
        this.projects = [];
        this.filteredProjects = [];
        this.currentView = 'grid';
        this.currentSort = 'name_asc';
        this.currentFilter = {
            status: '',
            role: '',
            search: ''
        };
        this.currentUser = null;
        
        this.init();
    }

    init() {
        console.log('🚀 === INITIALIZING PROJECTS MANAGER ===');
        
        // Check authentication
        if (!authUtils.isAuthenticated()) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Load current user info
        this.loadCurrentUser();
        
        // Load projects
        this.loadProjects();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('🚀 Projects Manager initialized');
    }

    async loadCurrentUser() {
        try {
            // Try to get user info from localStorage first
            const savedUserInfo = authUtils.getUserInfo();
            if (savedUserInfo && savedUserInfo.id && savedUserInfo.email) {
                this.currentUser = savedUserInfo;
                this.updateUserDisplay();
                return;
            }

            // Fallback: API call
            this.currentUser = await apiClient.get('/users/profile');
            if (this.currentUser) {
                authUtils.saveUserInfo(this.currentUser);
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
            this.currentUser = null;
        }
    }

    updateUserDisplay() {
        if (!this.currentUser) return;
        
        const displayName = this.currentUser.name || 
                           `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() ||
                           this.currentUser.email;
        
        const userDisplayName = document.getElementById('userDisplayName');
        const userDisplayNameDropdown = document.getElementById('userDisplayNameDropdown');
        
        if (userDisplayName) userDisplayName.textContent = displayName;
        if (userDisplayNameDropdown) userDisplayNameDropdown.textContent = displayName;
    }

    setupEventListeners() {
        // Search input with debounce
        let searchTimeout;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilter.search = e.target.value.trim();
                    this.currentPage = 0;
                    this.loadProjects();
                }, 300);
            });
        }
    }

    async loadProjects() {
        try {
            this.showLoadingState();
            
            const params = {
                page: this.currentPage,
                size: this.pageSize
            };

            // Add search parameter if exists
            if (this.currentFilter.search) {
                params.search = this.currentFilter.search;
            }

            // Add status filter if exists
            if (this.currentFilter.status) {
                params.status = this.currentFilter.status;
            }

            // Add role filter for server-side filtering
            if (this.currentFilter.role) {
                params.role = this.currentFilter.role;
            }

            // Add sorting (convert from old format)
            const [sortField, sortDirection] = this.currentSort.split('_');
            params.sort = `${sortField},${sortDirection}`;

            console.log('🔄 Loading projects with params:', params);
            
            // Use role-specific endpoints for better performance
            let endpoint = '/projects';
            if (this.currentFilter.role === 'managed') {
                endpoint = '/projects/managed';
                // Remove role param as it's in the endpoint
                delete params.role;
            } else if (this.currentFilter.role === 'member') {
                endpoint = '/projects/member';
                // Remove role param as it's in the endpoint
                delete params.role;
            }
            
            const response = await apiClient.get(endpoint, params);
            
            console.log('✅ Projects loaded:', response);
            
            // Handle paginated response
            if (response.content) {
                this.projects = response.content;
                this.totalPages = response.totalPages;
                this.totalElements = response.totalElements;
            } else {
                // Handle non-paginated response (fallback)
                this.projects = Array.isArray(response) ? response : [];
                this.totalPages = 1;
                this.totalElements = this.projects.length;
            }

            // No need for client-side filtering now since server does it
            this.filteredProjects = [...this.projects];
            this.renderProjects();
            this.renderPagination();
            
        } catch (error) {
            console.error('❌ Failed to load projects:', error);
            this.showErrorState();
        }
    }



    showLoadingState() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('paginationSection').style.display = 'none';
    }

    showErrorState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('paginationSection').style.display = 'none';
        
        // Update empty state for error
        const emptyState = document.getElementById('emptyState');
        emptyState.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle empty-icon"></i>
                <h4>Không thể tải danh sách dự án</h4>
                <p class="text-muted">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.</p>
                <button class="btn btn-primary" onclick="projectsManager.loadProjects()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Thử lại
                </button>
            </div>
        `;
    }

    renderProjects() {
        if (this.filteredProjects.length === 0) {
            this.showEmptyState();
            return;
        }

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('projectsContainer').style.display = 'block';
        document.getElementById('paginationSection').style.display = 'block';

        const container = document.getElementById('projectsGrid');
        
        if (this.currentView === 'grid') {
            container.className = 'projects-grid';
            container.innerHTML = this.filteredProjects.map(project => this.renderProjectCard(project)).join('');
        } else {
            container.className = 'projects-list';
            container.innerHTML = this.renderProjectsList();
        }
    }

    showEmptyState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('paginationSection').style.display = 'none';
    }

    renderProjectCard(project) {
        const leader = this.getProjectLeader(project);
        const statusClass = this.getStatusClass(project.status);
        const statusText = this.getStatusText(project.status);
        
        return `
            <div class="project-card" onclick="viewProject(${project.id})">
                <div class="project-header">
                    <div>
                        <h3 class="project-title">${this.escapeHtml(project.name)}</h3>
                        <span class="project-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <p class="project-description">${this.escapeHtml(project.description || 'Không có mô tả')}</p>
                
                <div class="project-meta">
                    <div class="meta-item">
                        <span class="meta-label">Ngày bắt đầu</span>
                        <span class="meta-value">${this.formatDate(project.startDate)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Ngày kết thúc</span>
                        <span class="meta-value">${this.formatDate(project.endDate)}</span>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-header">
                        <span class="progress-label">Tiến độ</span>
                        <span class="progress-value">${project.progress || 0}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                    </div>
                </div>
                
                <div class="project-leader">
                    <div class="leader-avatar">
                        ${this.getInitials(leader.firstName, leader.lastName)}
                    </div>
                    <div class="leader-info">
                        <div class="leader-name">${this.escapeHtml(leader.firstName + ' ' + leader.lastName)}</div>
                        <div class="leader-role">Trưởng nhóm</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderProjectsList() {
        return `
            <div class="list-header">
                <div>Tên dự án</div>
                <div>Trạng thái</div>
                <div>Tiến độ</div>
                <div>Ngày bắt đầu</div>
                <div>Ngày kết thúc</div>
                <div>Trưởng nhóm</div>
                <div></div>
            </div>
            ${this.filteredProjects.map(project => this.renderProjectListItem(project)).join('')}
        `;
    }

    renderProjectListItem(project) {
        const leader = this.getProjectLeader(project);
        const statusClass = this.getStatusClass(project.status);
        const statusText = this.getStatusText(project.status);
        
        return `
            <div class="list-item" onclick="viewProject(${project.id})">
                <div>
                    <div class="list-title">${this.escapeHtml(project.name)}</div>
                    <div class="list-description">${this.escapeHtml(project.description || '')}</div>
                </div>
                <div>
                    <span class="project-status ${statusClass}">${statusText}</span>
                </div>
                <div class="list-progress">
                    <div class="progress">
                        <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                    </div>
                    <span class="list-progress-text">${project.progress || 0}%</span>
                </div>
                <div>${this.formatDate(project.startDate)}</div>
                <div>${this.formatDate(project.endDate)}</div>
                <div>${this.escapeHtml(leader.firstName + ' ' + leader.lastName)}</div>
                <div>
                    <i class="bi bi-arrow-right text-muted"></i>
                </div>
            </div>
        `;
    }

    renderPagination() {
        if (this.totalPages <= 1) {
            document.getElementById('paginationSection').style.display = 'none';
            return;
        }

        document.getElementById('paginationSection').style.display = 'block';
        
        // Update items range
        const start = this.currentPage * this.pageSize + 1;
        const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
        document.getElementById('itemsRange').textContent = `${start}-${end}`;
        document.getElementById('totalItems').textContent = this.totalElements;

        // Render pagination buttons
        const paginationNav = document.getElementById('paginationNav');
        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 0 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="projectsManager.goToPage(${this.currentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(0, this.currentPage - 2);
        const endPage = Math.min(this.totalPages - 1, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="projectsManager.goToPage(${i})">${i + 1}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages - 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="projectsManager.goToPage(${this.currentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        paginationNav.innerHTML = paginationHTML;
    }

    // Helper Methods
    getProjectLeader(project) {
        const leader = project.members?.find(member => member.role === 'LEADER');
        return leader || { firstName: 'Unknown', lastName: 'User' };
    }

    getStatusClass(status) {
        const statusMap = {
            'NOT_STARTED': 'status-not-started',
            'IN_PROGRESS': 'status-in-progress',
            'ON_HOLD': 'status-on-hold',
            'COMPLETED': 'status-completed',
            'CANCELED': 'status-canceled',
            'OVERDUE': 'status-overdue'
        };
        return statusMap[status] || 'status-not-started';
    }

    getStatusText(status) {
        const statusMap = {
            'NOT_STARTED': 'Chưa bắt đầu',
            'IN_PROGRESS': 'Đang thực hiện',
            'ON_HOLD': 'Tạm dừng',
            'COMPLETED': 'Đã hoàn thành',
            'CANCELED': 'Đã hủy',
            'OVERDUE': 'Quá hạn'
        };
        return statusMap[status] || 'Chưa bắt đầu';
    }

    formatDate(timestamp) {
        if (!timestamp) return '--';
        return new Date(timestamp).toLocaleDateString('vi-VN');
    }

    getInitials(firstName, lastName) {
        return (firstName?.[0] || '') + (lastName?.[0] || '');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event Handlers
    goToPage(page) {
        if (page < 0 || page >= this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.loadProjects();
    }

    handleFilterChange() {
        const statusFilter = document.getElementById('statusFilter').value;
        const roleFilter = document.getElementById('roleFilter').value;
        
        this.currentFilter.status = statusFilter;
        this.currentFilter.role = roleFilter;
        this.currentPage = 0;
        
        console.log('🔍 Filter changed:', { status: statusFilter, role: roleFilter });
        this.loadProjects();
    }

    handleSortChange() {
        const sortSelect = document.getElementById('sortSelect');
        this.currentSort = sortSelect.value;
        this.currentPage = 0;
        
        console.log('🔄 Sort changed to:', this.currentSort);
        this.loadProjects();
    }

    toggleView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
        
        // Re-render projects
        this.renderProjects();
    }

    // Search handler
    handleSearch() {
        // This is handled by the input event listener with debounce
    }
}

// Global Functions
function viewProject(projectId) {
    window.location.href = `project-details.html?id=${projectId}`;
}

function createProject() {
    window.location.href = 'create-project.html';
}

// joinProject function is now handled by join-project-modal.js

// Filter and sort handlers (called from HTML)
function handleFilterChange() {
    if (window.projectsManager) {
        window.projectsManager.handleFilterChange();
    }
}

function handleSortChange() {
    if (window.projectsManager) {
        window.projectsManager.handleSortChange();
    }
}

function handleSearch() {
    // This is handled by input event listener
}

function toggleView(view) {
    if (window.projectsManager) {
        window.projectsManager.toggleView(view);
    }
}

// User menu functions
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

// Toast function
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
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 3000
    });
    
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

// Initialize
let projectsManager;
document.addEventListener('DOMContentLoaded', () => {
    projectsManager = new ProjectsManager();
    window.projectsManager = projectsManager;
});

// Sidebar Functions (from dashboard.js)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('expanded');
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            mainContent.style.marginLeft = '70px';
        } else {
            mainContent.style.marginLeft = '250px';
        }
    }
}

function setActiveMenu(element, page) {
    // Remove active class from all menu items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    element.classList.add('active');
    
    // Navigate to the appropriate page
    switch(page) {
        case 'home':
            window.location.href = 'index.html';
            break;
        case 'projects':
            // Already on projects page
            break;
        case 'tasks':
            window.location.href = 'tasks.html';
            break;
        case 'calendar':
            window.location.href = 'calendar.html';
            break;
    }
}
