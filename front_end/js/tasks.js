/**
 * Tasks Management JavaScript
 * Handles task listing, filtering, sorting, and CRUD operations
 */

class TasksManager {
    constructor() {
        this.currentView = 'list'; // Only list view
        this.currentPage = 0;
        this.pageSize = 12;
        this.currentFilters = {
            search: '',
            taskType: '',
            status: '',
            projectId: '',
            sort: 'created,desc'
        };
        this.projects = [];
        this.projectsCache = new Map(); // Cache for individual project data
        this.tasks = [];
        this.totalElements = 0;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Wait a bit for API client to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load projects for filter dropdown (no need to wait)
        this.loadProjects();
        // Load tasks (which will fetch individual project details)
        this.loadTasks();
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.currentPage = 0;
                    this.loadTasks();
                }, 500);
            });
        }

        // Filter changes
        const taskTypeFilter = document.getElementById('taskTypeFilter');
        const statusFilter = document.getElementById('statusFilter');
        const projectFilter = document.getElementById('projectFilter');
        const sortSelect = document.getElementById('sortSelect');

        if (taskTypeFilter) {
            taskTypeFilter.addEventListener('change', () => {
                this.currentFilters.taskType = taskTypeFilter.value;
                this.currentPage = 0;
                this.loadTasks();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentFilters.status = statusFilter.value;
                this.currentPage = 0;
                this.loadTasks();
            });
        }

        if (projectFilter) {
            projectFilter.addEventListener('change', () => {
                this.currentFilters.projectId = projectFilter.value;
                this.currentPage = 0;
                this.loadTasks();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentFilters.sort = sortSelect.value;
                this.currentPage = 0;
                this.loadTasks();
            });
        }
    }

    async loadProjects() {
        try {
            console.log('Loading all projects for filter...');
            
            // Check if api is available
            if (typeof api === 'undefined' || !api.projects) {
                console.error('API client not available');
                return;
            }
            
            // Use api instead of apiClient for endpoints
            const response = await api.projects.getAll();
            console.log('Projects response:', response);
            this.projects = response.content || response;
            console.log('Loaded projects:', this.projects);
            this.populateProjectFilter();
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async fetchProjectById(projectId) {
        if (!projectId) return null;
        
        // Check cache first
        if (this.projectsCache.has(projectId)) {
            console.log('Project found in cache:', projectId);
            return this.projectsCache.get(projectId);
        }
        
        try {
            console.log('Fetching project by ID:', projectId);
            
            // Check if api is available
            if (typeof api === 'undefined' || !api.projects) {
                console.error('API client not available');
                return null;
            }
            
            const project = await api.projects.getById(projectId);
            console.log('Fetched project:', project);
            
            // Cache the project
            this.projectsCache.set(projectId, project);
            
            return project;
        } catch (error) {
            console.error('Error fetching project:', projectId, error);
            return null;
        }
    }

    async loadProjectsForTasks(tasks) {
        const projectIds = [...new Set(tasks.map(task => task.projectId).filter(id => id))];
        console.log('Loading projects for IDs:', projectIds);
        
        const promises = projectIds.map(id => this.fetchProjectById(id));
        await Promise.allSettled(promises);
        
        console.log('Projects cache after loading:', this.projectsCache);
    }

    populateProjectFilter() {
        const projectFilter = document.getElementById('projectFilter');
        if (!projectFilter) return;

        // Clear existing options except "Tất cả dự án"
        projectFilter.innerHTML = '<option value="">Tất cả dự án</option>';

        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectFilter.appendChild(option);
        });
    }

    async loadTasks() {
        try {
            this.showLoading();

            const params = {
                page: this.currentPage,
                size: this.pageSize,
                sort: this.currentFilters.sort
            };

            // Add filters if they exist
            if (this.currentFilters.search) {
                params.search = this.currentFilters.search;
            }
            if (this.currentFilters.status) {
                params.status = this.currentFilters.status;
            }
            if (this.currentFilters.projectId) {
                params.projectId = this.currentFilters.projectId;
            }

            let response;
            
            // Choose endpoint based on task type filter
            switch (this.currentFilters.taskType) {
                case 'my':
                    response = await api.tasks.getAll(params);
                    break;
                case 'created':
                    response = await apiClient.get('/tasks/created', params);
                    break;
                case 'assigned':
                    response = await apiClient.get('/tasks/assigned', params);
                    break;
                default:
                    response = await apiClient.get('/tasks/my', params);
                    break;
            }

            this.tasks = response.content || [];
            this.totalElements = response.totalElements || this.tasks.length;

            // Load projects for these tasks
            await this.loadProjectsForTasks(this.tasks);

            this.renderTasks();
            this.renderPagination();
            this.hideLoading();

            if (this.tasks.length === 0) {
                this.showEmptyState();
            } else {
                this.hideEmptyState();
            }

        } catch (error) {
            console.error('Error loading tasks:', error);
            this.hideLoading();
            this.showError('Không thể tải danh sách nhiệm vụ');
        }
    }

    renderTasks() {
        const tasksGrid = document.getElementById('tasksGrid');
        if (!tasksGrid) return;

        // Always use list view
        tasksGrid.className = 'tasks-list';
        tasksGrid.innerHTML = '';

        if (!this.tasks || this.tasks.length === 0) {
            tasksGrid.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-check2-square fs-1 text-muted"></i>
                    <h3>Chưa có nhiệm vụ</h3>
                    <p class="text-muted">Bạn chưa có nhiệm vụ nào. Hãy tạo nhiệm vụ đầu tiên!</p>
                </div>
            `;
            return;
        }

        // Filter level 1 tasks (top-level tasks)
        const topLevelTasks = this.tasks.filter(task => task.level === 1);
        console.log('Top level tasks (level 1):', topLevelTasks.length);
        
        // If no level 1 tasks, show all tasks
        const tasksToShow = topLevelTasks.length > 0 ? topLevelTasks : this.tasks;
        console.log('Tasks to show:', tasksToShow.length);

        tasksToShow.forEach(task => {
            const taskElement = this.createTaskElement(task, this.tasks);
            tasksGrid.appendChild(taskElement);
        });

        // Show tasks container
        const tasksContainer = document.getElementById('tasksContainer');
        if (tasksContainer) {
            tasksContainer.style.display = 'block';
        }
    }

    createTaskElement(task, allTasks = []) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-list-item'; // Always list item
        
        // Check for child tasks
        const childTasks = allTasks.filter(t => t.parentId === task.id);
        const hasChildren = childTasks.length > 0;
        
        if (hasChildren) {
            taskCard.classList.add('has-children', 'collapsed'); // Default collapsed
        }
        
        taskCard.setAttribute('data-task-id', task.id);
        
        const statusClass = this.getStatusClass(task.status);
        const priorityClass = this.getPriorityClass(task.priority);
        
        const assignedUsersHtml = task.assignedUsers && task.assignedUsers.length > 0 
            ? task.assignedUsers.map(user => 
                `<span class="user-avatar" title="${user.firstName} ${user.lastName}">
                    ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
                </span>`
              ).join('')
            : '<span class="text-muted">Chưa giao</span>';

        const deadlineHtml = task.deadline 
            ? `<span class="deadline ${this.isOverdue(task.deadline) ? 'overdue' : ''}">
                <i class="bi bi-calendar"></i>
                ${this.formatDate(task.deadline)}
              </span>`
            : '';

        const projectInfo = this.getProjectInfo(task.projectId);

        // Always render as list item
        taskCard.innerHTML = `
            ${hasChildren ? `<button class="task-expand-btn" onclick="event.stopPropagation(); tasksManager.toggleTaskChildren(${task.id})" id="expand-${task.id}"><i class="bi bi-chevron-right"></i></button>` : ''}
            <div class="task-list-content">
                <div class="task-main">
                    <div class="task-header">
                        <span class="task-id">#${task.id}</span>
                        <h5 class="task-title" onclick="tasksManager.viewTask(${task.id})">${task.title}</h5>
                        <span class="task-level-badge">
                            <i class="bi bi-flag me-1"></i>Level ${task.level || 1}
                        </span>
                    </div>
                    <p class="task-description">${task.description || 'Không có mô tả'}</p>
                    <div class="task-meta">
                        <span class="project-info" onclick="tasksManager.goToProject(${task.projectId})" style="cursor: pointer;" title="Xem chi tiết dự án">
                            <i class="bi bi-folder" style="color: ${projectInfo.color}"></i>
                            <span class="project-name">${projectInfo.name}</span>
                            ${projectInfo.status ? `<span class="project-status-badge ${this.getProjectStatusClass(projectInfo.status)}">${this.getProjectStatusText(projectInfo.status)}</span>` : ''}
                        </span>
                        ${deadlineHtml}
                    </div>
                </div>
                
                <div class="task-details">
                    <span class="priority-badge priority-${priorityClass}">
                        ${this.getPriorityText(task.priority)}
                    </span>
                    <span class="status-badge status-${statusClass}">
                        ${this.getStatusText(task.status)}
                    </span>
                    <div class="progress-info">
                        <span>${task.progress}%</span>
                        <div class="progress progress-sm">
                            <div class="progress-bar" style="width: ${task.progress}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="task-users">
                    ${assignedUsersHtml}
                </div>
                
                <div class="task-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="tasksManager.editTask(${task.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="tasksManager.viewTask(${task.id})">
                                <i class="bi bi-eye me-2"></i>Xem chi tiết
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="tasksManager.editTask(${task.id})">
                                <i class="bi bi-pencil me-2"></i>Chỉnh sửa
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="tasksManager.deleteTask(${task.id})">
                                <i class="bi bi-trash me-2"></i>Xóa
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
            ${hasChildren ? `
                <div class="task-children collapsed" id="children-${task.id}">
                    ${childTasks.map(childTask => this.createTaskHTML(childTask, allTasks)).join('')}
                </div>
            ` : ''}
        `;

        return taskCard;
    }

    // Helper method to create HTML string for child tasks
    createTaskHTML(task, allTasks = []) {
        const childTasks = allTasks.filter(t => t.parentId === task.id);
        const hasChildren = childTasks.length > 0;
        
        const statusClass = this.getStatusClass(task.status);
        const priorityClass = this.getPriorityClass(task.priority);
        
        const assignedUsersHtml = task.assignedUsers && task.assignedUsers.length > 0 
            ? task.assignedUsers.map(user => 
                `<span class="user-avatar" title="${user.firstName} ${user.lastName}">
                    ${user.firstName.charAt(0)}${user.lastName.charAt(0)}
                </span>`
              ).join('')
            : '<span class="text-muted">Chưa giao</span>';

        const deadlineHtml = task.deadline 
            ? `<span class="deadline ${this.isOverdue(task.deadline) ? 'overdue' : ''}">
                <i class="bi bi-calendar"></i>
                ${this.formatDate(task.deadline)}
              </span>`
            : '';

        const projectInfo = this.getProjectInfo(task.projectId);

        return `
            <div class="task-list-item ${hasChildren ? 'has-children collapsed' : ''}" data-task-id="${task.id}">
                ${hasChildren ? `<button class="task-expand-btn" onclick="event.stopPropagation(); tasksManager.toggleTaskChildren(${task.id})" id="expand-${task.id}"><i class="bi bi-chevron-right"></i></button>` : ''}
                <div class="task-list-content">
                    <div class="task-main">
                        <div class="task-header">
                            <span class="task-id">#${task.id}</span>
                            <h5 class="task-title" onclick="tasksManager.viewTask(${task.id})">${task.title}</h5>
                            <span class="task-level-badge">
                                <i class="bi bi-flag me-1"></i>Level ${task.level || 1}
                            </span>
                        </div>
                        <p class="task-description">${task.description || 'Không có mô tả'}</p>
                        <div class="task-meta">
                            <span class="project-info" onclick="tasksManager.goToProject(${task.projectId})" style="cursor: pointer;" title="Xem chi tiết dự án">
                                <i class="bi bi-folder" style="color: ${projectInfo.color}"></i>
                                <span class="project-name">${projectInfo.name}</span>
                                ${projectInfo.status ? `<span class="project-status-badge ${this.getProjectStatusClass(projectInfo.status)}">${this.getProjectStatusText(projectInfo.status)}</span>` : ''}
                            </span>
                            ${deadlineHtml}
                        </div>
                    </div>
                    
                    <div class="task-details">
                        <span class="priority-badge priority-${priorityClass}">
                            ${this.getPriorityText(task.priority)}
                        </span>
                        <span class="status-badge status-${statusClass}">
                            ${this.getStatusText(task.status)}
                        </span>
                        <div class="progress-info">
                            <span>${task.progress}%</span>
                            <div class="progress progress-sm">
                                <div class="progress-bar" style="width: ${task.progress}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="task-users">
                        ${assignedUsersHtml}
                    </div>
                    
                    <div class="task-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="tasksManager.editTask(${task.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="tasksManager.viewTask(${task.id})">
                                    <i class="bi bi-eye me-2"></i>Xem chi tiết
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="tasksManager.editTask(${task.id})">
                                    <i class="bi bi-pencil me-2"></i>Chỉnh sửa
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="tasksManager.deleteTask(${task.id})">
                                    <i class="bi bi-trash me-2"></i>Xóa
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                ${hasChildren ? `
                    <div class="task-children collapsed" id="children-${task.id}">
                        ${childTasks.map(childTask => this.createTaskHTML(childTask, allTasks)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderPagination() {
        const paginationSection = document.getElementById('paginationSection');
        const paginationNav = document.getElementById('paginationNav');
        const itemsRange = document.getElementById('itemsRange');
        const totalItems = document.getElementById('totalItems');

        if (!paginationSection || !paginationNav) return;

        // Update items info
        const startItem = this.currentPage * this.pageSize + 1;
        const endItem = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
        
        if (itemsRange) {
            itemsRange.textContent = `${startItem}-${endItem}`;
        }
        if (totalItems) {
            totalItems.textContent = this.totalElements;
        }

        // Show/hide pagination
        if (this.totalElements <= this.pageSize) {
            paginationSection.style.display = 'none';
            return;
        }

        paginationSection.style.display = 'flex';

        // Calculate total pages
        const totalPages = Math.ceil(this.totalElements / this.pageSize);

        // Clear existing pagination
        paginationNav.innerHTML = '';

        // Previous button
        const prevBtn = this.createPaginationButton('‹', this.currentPage - 1, this.currentPage === 0);
        paginationNav.appendChild(prevBtn);

        // Page numbers
        const startPage = Math.max(0, this.currentPage - 2);
        const endPage = Math.min(totalPages - 1, this.currentPage + 2);

        if (startPage > 0) {
            paginationNav.appendChild(this.createPaginationButton('1', 0));
            if (startPage > 1) {
                paginationNav.appendChild(this.createPaginationEllipsis());
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = this.createPaginationButton(i + 1, i, false, i === this.currentPage);
            paginationNav.appendChild(pageBtn);
        }

        if (endPage < totalPages - 1) {
            if (endPage < totalPages - 2) {
                paginationNav.appendChild(this.createPaginationEllipsis());
            }
            paginationNav.appendChild(this.createPaginationButton(totalPages, totalPages - 1));
        }

        // Next button
        const nextBtn = this.createPaginationButton('›', this.currentPage + 1, this.currentPage >= totalPages - 1);
        paginationNav.appendChild(nextBtn);
    }

    createPaginationButton(text, page, disabled = false, active = false) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;

        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;

        if (!disabled) {
            a.onclick = (e) => {
                e.preventDefault();
                this.currentPage = page;
                this.loadTasks();
            };
        }

        li.appendChild(a);
        return li;
    }

    createPaginationEllipsis() {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        const span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '...';
        li.appendChild(span);
        return li;
    }

    // Utility functions
    getStatusClass(status) {
        const statusMap = {
            'NOT_STARTED': 'not-started',
            'IN_PROGRESS': 'in-progress',
            'ON_HOLD': 'on-hold',
            'COMPLETED': 'completed',
            'CANCELED': 'canceled',
            'OVERDUE': 'overdue'
        };
        return statusMap[status] || 'unknown';
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
        return statusMap[status] || status;
    }

    getPriorityClass(priority) {
        if (priority >= 4) return 'high';
        if (priority >= 2) return 'medium';
        return 'low';
    }

    getPriorityText(priority) {
        if (priority >= 4) return 'Cao';
        if (priority >= 2) return 'Trung bình';
        return 'Thấp';
    }

    getProjectName(projectId) {
        // Check cache first
        const cachedProject = this.projectsCache.get(projectId);
        if (cachedProject) {
            return cachedProject.name;
        }
        
        // Fallback to projects array
        const project = this.projects.find(p => p.id == projectId);
        return project ? project.name : `Dự án #${projectId}`;
    }

    getProjectInfo(projectId) {
        console.log('Getting project info for ID:', projectId, 'type:', typeof projectId);
        
        // Check cache first
        const cachedProject = this.projectsCache.get(projectId);
        if (cachedProject) {
            console.log('Found project in cache:', cachedProject);
            return {
                name: cachedProject.name,
                description: cachedProject.description || '',
                status: cachedProject.status || '',
                color: cachedProject.color || '#764BA2'
            };
        }
        
        // Fallback to projects array (for compatibility)
        console.log('Available projects in array:', this.projects);
        const project = this.projects.find(p => p.id == projectId);
        console.log('Found project in array:', project);
        
        if (project) {
            return {
                name: project.name,
                description: project.description || '',
                status: project.status || '',
                color: project.color || '#764BA2'
            };
        }
        
        // No project found
        return {
            name: `Dự án #${projectId}`, // Show project ID as fallback
            description: '',
            status: '',
            color: '#764BA2'
        };
    }

    getProjectStatusText(status) {
        const statusMap = {
            'PLANNING': 'Lên kế hoạch',
            'IN_PROGRESS': 'Đang thực hiện',
            'ON_HOLD': 'Tạm dừng',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    getProjectStatusClass(status) {
        const classMap = {
            'PLANNING': 'planning',
            'IN_PROGRESS': 'in-progress',
            'ON_HOLD': 'on-hold',
            'COMPLETED': 'completed',
            'CANCELLED': 'cancelled'
        };
        return classMap[status] || '';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    isOverdue(deadline) {
        return new Date(deadline) < new Date();
    }

    // UI state functions
    showLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    showError(message) {
        // You can implement a toast or modal here
        console.error(message);
        alert(message);
    }

    // Task actions
    viewTask(taskId) {
        window.location.href = `task-details.html?id=${taskId}`;
    }

    editTask(taskId) {
        window.location.href = `task-edit.html?id=${taskId}`;
    }

    goToProject(projectId) {
        if (projectId) {
            // Option 1: Go to specific project details
            // window.location.href = `project-details.html?id=${projectId}`;
            
            // Option 2: Go to projects list page
            window.location.href = 'projects.html';
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) {
            return;
        }

        try {
            await api.tasks.delete(taskId);
            this.loadTasks();
            this.showSuccess('Xóa nhiệm vụ thành công');
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showError('Không thể xóa nhiệm vụ');
        }
    }

    showSuccess(message) {
        // You can implement a toast here
        console.log(message);
    }

    // Toggle visibility of child tasks
    toggleTaskChildren(taskId) {
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        const childrenContainer = document.getElementById(`children-${taskId}`);
        const expandButton = document.getElementById(`expand-${taskId}`);
        
        if (!taskItem || !childrenContainer || !expandButton) return;
        
        const isCollapsed = taskItem.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand - show children
            taskItem.classList.remove('collapsed');
            expandButton.innerHTML = '<i class="bi bi-chevron-down"></i>';
            expandButton.classList.add('expanded');
        } else {
            // Collapse - hide children
            taskItem.classList.add('collapsed');
            expandButton.innerHTML = '<i class="bi bi-chevron-right"></i>';
            expandButton.classList.remove('expanded');
        }
    }
}

// Global functions for HTML onclick events
window.handleFilterChange = function() {
    if (window.tasksManager) {
        window.tasksManager.loadTasks();
    }
};

window.handleSortChange = function() {
    if (window.tasksManager) {
        window.tasksManager.loadTasks();
    }
};

// Toggle visibility of child tasks (for hierarchical display)
window.toggleTaskChildren = function(taskId) {
    if (window.tasksManager) {
        window.tasksManager.toggleTaskChildren(taskId);
    }
};

window.createTask = function() {
    window.location.href = 'task-create.html';
};

window.createProject = function() {
    window.location.href = 'create-project.html';
};

window.showTaskStats = function() {
    // Implement task statistics modal/page
    console.log('Show task statistics');
};

window.goToProjects = function() {
    window.location.href = 'projects.html';
};

// Go to specific project details
window.goToProject = function(projectId) {
    if (window.tasksManager) {
        window.tasksManager.goToProject(projectId);
    } else if (projectId) {
        // Option 1: Go to specific project details
        // window.location.href = `project-details.html?id=${projectId}`;
        
        // Option 2: Go to projects list page
        window.location.href = 'projects.html';
    }
};

// Navigation function for sidebar menu
window.setActiveMenu = function(element, page) {
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
            window.location.href = 'projects.html';
            break;
        case 'tasks':
            // Already on tasks page
            break;
        case 'calendar':
            window.location.href = 'calendar.html';
            break;
        default:
            console.log('Unknown page:', page);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!authUtils.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Debug API availability
    console.log('apiClient available:', typeof apiClient !== 'undefined');
    console.log('api available:', typeof api !== 'undefined');
    console.log('api.projects available:', typeof api !== 'undefined' && api.projects);

    // Initialize tasks manager
    window.tasksManager = new TasksManager();
});
