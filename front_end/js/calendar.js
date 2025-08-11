/**
 * Calendar Page JavaScript
 * Handles calendar views (day, week, month) and displays tasks/projects deadlines
 */

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.events = [];
        this.currentUser = null;
        
        // Vietnamese day names
        this.dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        this.monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        
        this.init();
    }

    init() {
        console.log('🚀 === INITIALIZING CALENDAR MANAGER ===');
        
        // Check authentication
        if (!authUtils.isAuthenticated()) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Load current user info
        this.loadCurrentUser();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load events
        this.loadEvents();
        
        // Render initial view
        this.renderCurrentView();
        
        console.log('🚀 Calendar Manager initialized');
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
        
        const userDisplayNameDropdown = document.getElementById('userDisplayNameDropdown');
        
        if (userDisplayNameDropdown) userDisplayNameDropdown.textContent = displayName;
    }

    setupEventListeners() {
        // View tabs
        document.querySelectorAll('.calendar-tabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const view = tab.dataset.view;
                this.switchView(view);
            });
        });

        // Navigation buttons
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.navigatePrevious();
        });
        
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.navigateNext();
        });
        
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.goToToday();
        });

        // Tooltip events
        this.setupTooltipEvents();
    }

    setupTooltipEvents() {
        let tooltipTimeout;
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('calendar-event')) {
                clearTimeout(tooltipTimeout);
                tooltipTimeout = setTimeout(() => {
                    this.showTooltip(e.target, e);
                }, 300);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('calendar-event')) {
                clearTimeout(tooltipTimeout);
                this.hideTooltip();
            }
        });

        // Handle event clicks for navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-event') && !e.target.classList.contains('more-events')) {
                this.handleEventClick(e.target);
            }
        });
    }

    async loadEvents() {
        try {
            this.showLoadingState();
            
            console.log('🔄 Loading calendar events...');
            
            // Load tasks and projects in parallel
            const [tasksResponse, projectsResponse] = await Promise.all([
                this.loadTasks(),
                this.loadProjects()
            ]);
            
            // Combine and process events
            this.events = [...tasksResponse, ...projectsResponse];
            
            console.log('✅ Calendar events loaded:', this.events.length);
            console.log('📊 Events breakdown:', {
                tasks: tasksResponse.length,
                projects: projectsResponse.length,
                total: this.events.length
            });
            
            // Log sample events
            if (this.events.length > 0) {
                console.log('📅 Sample events:', this.events.slice(0, 3));
            }
            
            this.hideLoadingState();
            this.renderCurrentView();
            
        } catch (error) {
            console.error('❌ Failed to load calendar events:', error);
            this.hideLoadingState();
            this.showErrorState();
        }
    }

    async loadTasks() {
        try {
            const response = await apiClient.get('/tasks/my');
            
            console.log('📋 Raw tasks response:', response);
            
            const taskEvents = response.map(task => {
                let taskDate = null;
                
                // Try to parse deadline in different formats
                if (task.deadline) {
                    taskDate = new Date(task.deadline);
                    
                    // If invalid date, try parsing as timestamp
                    if (isNaN(taskDate.getTime())) {
                        taskDate = new Date(parseInt(task.deadline));
                    }
                } else {
                    console.log(`⚠️ Task "${task.title}" has no deadline`);
                }
                
                console.log(`📋 Task "${task.title}": deadline=${task.deadline}, parsed=${taskDate}`);
                
                return {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    date: taskDate,
                    type: 'task',
                    status: task.status,
                    priority: task.priority,
                    projectId: task.projectId,
                    projectName: task.projectName,
                    assignee: task.assignee
                };
            }).filter(event => {
                const isValid = event.date && !isNaN(event.date.getTime());
                if (!isValid && event.title) {
                    console.warn(`⚠️ Filtered out task "${event.title}" - ${event.date ? 'invalid date' : 'no date'}:`, event.date);
                }
                return isValid;
            });
            
            console.log('✅ Processed task events:', taskEvents);
            return taskEvents;
            
        } catch (error) {
            console.warn('Failed to load tasks for calendar:', error);
            return [];
        }
    }

    async loadProjects() {
        try {
            const response = await apiClient.get('/projects');
            
            const projects = response.content || response;
            const events = [];
            
            projects.forEach(project => {
                // Add project start date
                if (project.startDate) {
                    events.push({
                        id: `project-start-${project.id}`,
                        title: `Bắt đầu: ${project.name}`,
                        description: project.description,
                        date: new Date(project.startDate),
                        type: 'project',
                        subType: 'start',
                        status: project.status,
                        projectId: project.id,
                        projectName: project.name
                    });
                }
                
                // Add project end date
                if (project.endDate) {
                    events.push({
                        id: `project-end-${project.id}`,
                        title: `Hạn cuối: ${project.name}`,
                        description: project.description,
                        date: new Date(project.endDate),
                        type: 'project',
                        subType: 'end',
                        status: project.status,
                        projectId: project.id,
                        projectName: project.name
                    });
                }
            });
            
            return events.filter(event => event.date && !isNaN(event.date.getTime()));
            
        } catch (error) {
            console.warn('Failed to load projects for calendar:', error);
            return [];
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update tab states
        document.querySelectorAll('.calendar-tabs .nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${view}Tab`).classList.add('active');
        
        // Hide all views
        document.querySelectorAll('.calendar-view').forEach(viewEl => {
            viewEl.style.display = 'none';
        });
        
        // Show current view
        document.getElementById(`${view}View`).style.display = 'block';
        
        this.renderCurrentView();
    }

    renderCurrentView() {
        this.updatePeriodDisplay();
        
        switch (this.currentView) {
            case 'day':
                this.renderDayView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'month':
                this.renderMonthView();
                break;
        }
    }

    updatePeriodDisplay() {
        const periodElement = document.getElementById('currentPeriod');
        let displayText = '';
        
        switch (this.currentView) {
            case 'day':
                displayText = this.currentDate.toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                break;
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                displayText = `${weekStart.getDate()} - ${weekEnd.getDate()} ${this.monthNames[weekEnd.getMonth()]}, ${weekEnd.getFullYear()}`;
                break;
            case 'month':
                displayText = `${this.monthNames[this.currentDate.getMonth()]}, ${this.currentDate.getFullYear()}`;
                break;
        }
        
        periodElement.textContent = displayText;
    }

    renderMonthView() {
        const monthHeader = document.querySelector('#monthView .month-header');
        const monthGrid = document.querySelector('#monthView .month-grid');
        
        // Render header
        monthHeader.innerHTML = this.dayNames.map(day => 
            `<div class="month-header-day">${day}</div>`
        ).join('');
        
        // Get month data
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = this.getWeekStart(firstDay);
        
        // Calculate number of weeks needed
        const weeksNeeded = Math.ceil((lastDay.getDate() + firstDay.getDay()) / 7);
        const totalCells = weeksNeeded * 7;
        
        // Render grid
        let gridHTML = '';
        const today = new Date();
        
        for (let i = 0; i < totalCells; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = this.isSameDay(currentDate, today);
            const dayEvents = this.getEventsForDate(currentDate);
            
            // Debug logging for current date
            if (dayEvents.length > 0) {
                console.log(`📅 ${currentDate.toDateString()}: ${dayEvents.length} events`, dayEvents.map(e => e.title));
            }
            
            let cellClass = 'month-cell';
            if (!isCurrentMonth) cellClass += ' other-month';
            if (isToday) cellClass += ' today';
            
            gridHTML += `
                <div class="${cellClass}" data-date="${currentDate.toISOString()}">
                    <div class="month-cell-date">${currentDate.getDate()}</div>
                    <div class="month-cell-events">
                        ${this.renderDayEvents(dayEvents)}
                    </div>
                </div>
            `;
        }
        
        monthGrid.innerHTML = gridHTML;
    }

    renderWeekView() {
        const weekHeader = document.querySelector('#weekView .week-header');
        const weekContent = document.querySelector('#weekView .week-content');
        
        const weekStart = this.getWeekStart(this.currentDate);
        
        // Render header
        let headerHTML = '<div class="week-header-time"></div>';
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            headerHTML += `
                <div class="week-header-day">
                    <div>${this.dayNames[day.getDay()]}</div>
                    <div>${day.getDate()}</div>
                </div>
            `;
        }
        weekHeader.innerHTML = headerHTML;
        
        // Render content with time slots
        let contentHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const timeText = hour.toString().padStart(2, '0') + ':00';
            contentHTML += `<div class="week-time-slot">${timeText}</div>`;
            
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(weekStart);
                currentDate.setDate(weekStart.getDate() + day);
                currentDate.setHours(hour);
                
                const hourEvents = this.getEventsForDateTime(currentDate);
                
                contentHTML += `
                    <div class="week-day-column" data-datetime="${currentDate.toISOString()}">
                        ${this.renderTimeSlotEvents(hourEvents)}
                    </div>
                `;
            }
        }
        
        weekContent.innerHTML = contentHTML;
    }

    renderDayView() {
        const timeColumn = document.querySelector('#dayView .time-column');
        const dayContent = document.querySelector('#dayView .day-content');
        
        // Render time column
        let timeHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const timeText = hour.toString().padStart(2, '0') + ':00';
            timeHTML += `<div class="time-slot">${timeText}</div>`;
        }
        timeColumn.innerHTML = timeHTML;
        
        // Render day content
        let contentHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const currentDateTime = new Date(this.currentDate);
            currentDateTime.setHours(hour, 0, 0, 0);
            
            const hourEvents = this.getEventsForDateTime(currentDateTime);
            
            contentHTML += `
                <div class="day-hour-slot" data-datetime="${currentDateTime.toISOString()}">
                    ${this.renderTimeSlotEvents(hourEvents)}
                </div>
            `;
        }
        dayContent.innerHTML = contentHTML;
    }

    renderDayEvents(events) {
        const maxVisible = 3;
        const visibleEvents = events.slice(0, maxVisible).map(event => this.renderEventElement(event)).join('');
        
        if (events.length > maxVisible) {
            const moreCount = events.length - maxVisible;
            const moreEventsHTML = `
                <div class="calendar-event more-events" 
                     onclick="calendarManager.showMoreEventsModal(${JSON.stringify(events).replace(/"/g, '&quot;')})">
                    +${moreCount} khác
                </div>
            `;
            return visibleEvents + moreEventsHTML;
        }
        
        return visibleEvents;
    }

    renderTimeSlotEvents(events) {
        return events.map(event => this.renderEventElement(event)).join('');
    }

    renderEventElement(event) {
        const statusClass = this.getStatusClass(event.status);
        const typeClass = event.type;
        
        return `
            <div class="calendar-event ${typeClass} ${statusClass}" 
                 data-event-id="${event.id}"
                 data-event-type="${event.type}"
                 data-event-data='${JSON.stringify(event)}'
                 title="Click để xem chi tiết">
                ${this.escapeHtml(event.title)}
            </div>
        `;
    }

    getEventsForDate(date) {
        return this.events.filter(event => this.isSameDay(event.date, date));
    }

    getEventsForDateTime(dateTime) {
        return this.events.filter(event => {
            // For day/week view, show events on the same day
            // If event has specific time (non-zero hours/minutes), match the hour
            // If event has no specific time (00:00), show it in first time slot (00:00)
            const isSameDay = this.isSameDay(event.date, dateTime);
            
            if (!isSameDay) return false;
            
            // If the event has a specific time (not 00:00), match the hour
            if (event.date.getHours() !== 0 || event.date.getMinutes() !== 0) {
                return event.date.getHours() === dateTime.getHours();
            }
            
            // If event has no specific time (00:00), show it in the first time slot (00:00)
            return dateTime.getHours() === 0;
        });
    }

    showTooltip(element, mouseEvent) {
        const tooltip = document.getElementById('eventTooltip');
        const eventData = JSON.parse(element.dataset.eventData);
        
        // Update tooltip content
        const title = tooltip.querySelector('.tooltip-title');
        const type = tooltip.querySelector('.tooltip-type');
        const description = tooltip.querySelector('.tooltip-description');
        const time = tooltip.querySelector('.tooltip-time');
        const status = tooltip.querySelector('.tooltip-status');
        
        title.textContent = eventData.title;
        type.textContent = eventData.type === 'task' ? 'Nhiệm vụ' : 'Dự án';
        description.textContent = eventData.description || 'Không có mô tả';
        time.textContent = new Date(eventData.date).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusText = this.getStatusText(eventData.status);
        const statusClass = this.getStatusClass(eventData.status);
        status.textContent = statusText;
        status.className = `tooltip-status ${statusClass}`;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.display = 'block';
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        
        // Adjust if tooltip goes off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = `${rect.top - tooltipRect.height}px`;
        }
    }

    hideTooltip() {
        const tooltip = document.getElementById('eventTooltip');
        tooltip.style.display = 'none';
    }

    handleEventClick(element) {
        try {
            const eventData = JSON.parse(element.dataset.eventData);
            console.log('🔗 Event clicked:', eventData);
            
            // Hide tooltip when clicking
            this.hideTooltip();
            
            // Navigate based on event type
            if (eventData.type === 'task') {
                this.navigateToTaskDetails(eventData);
            } else if (eventData.type === 'project') {
                this.navigateToProjectDetails(eventData);
            }
        } catch (error) {
            console.error('❌ Error handling event click:', error);
            showToast('Không thể mở chi tiết. Vui lòng thử lại.', 'error');
        }
    }

    navigateToTaskDetails(taskData) {
        // Extract task ID from the event ID
        let taskId = taskData.id;
        
        // If it's a composite ID, extract the actual task ID
        if (typeof taskId === 'string' && taskId.includes('-')) {
            // For task events, the ID should be the actual task ID
            taskId = taskData.id;
        }
        
        console.log('🔗 Navigating to task details:', taskId);
        
        // Navigate to task-details.html
        window.location.href = `task-details.html?id=${taskId}`;
    }

    navigateToProjectDetails(projectData) {
        // Extract project ID from the event data
        let projectId = projectData.projectId;
        
        // If projectId is not available, try to extract from the composite ID
        if (!projectId && typeof projectData.id === 'string') {
            // For project events like "project-start-1" or "project-end-1"
            const match = projectData.id.match(/project-(start|end)-(\d+)/);
            if (match) {
                projectId = match[2];
            }
        }
        
        if (!projectId) {
            console.error('❌ Cannot determine project ID from:', projectData);
            showToast('Không thể xác định ID dự án', 'error');
            return;
        }
        
        console.log('🔗 Navigating to project details:', projectId);
        window.location.href = `project-details.html?id=${projectId}`;
    }

    showMoreEventsModal(events) {
        // Create a simple modal to show all events for that day
        const modalHTML = `
            <div class="modal fade" id="moreEventsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-event me-2"></i>Tất cả sự kiện
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="list-group">
                                ${events.map(event => `
                                    <a href="#" class="list-group-item list-group-item-action" 
                                       onclick="calendarManager.handleEventFromModal('${event.id}', '${event.type}'); return false;">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1">${this.escapeHtml(event.title)}</h6>
                                            <small class="text-muted">${event.type === 'task' ? 'Nhiệm vụ' : 'Dự án'}</small>
                                        </div>
                                        <p class="mb-1">${this.escapeHtml(event.description || 'Không có mô tả')}</p>
                                        <small class="text-muted">${this.getStatusText(event.status)}</small>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('moreEventsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('moreEventsModal'));
        modal.show();
        
        // Clean up when modal is hidden
        document.getElementById('moreEventsModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('moreEventsModal').remove();
        });
    }

    handleEventFromModal(eventId, eventType) {
        // Close modal first
        const modal = bootstrap.Modal.getInstance(document.getElementById('moreEventsModal'));
        modal.hide();
        
        // Find the event data
        const eventData = this.events.find(event => event.id === eventId);
        if (eventData) {
            if (eventType === 'task') {
                this.navigateToTaskDetails(eventData);
            } else if (eventType === 'project') {
                this.navigateToProjectDetails(eventData);
            }
        }
    }

    // Navigation methods
    navigatePrevious() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
        this.renderCurrentView();
    }

    navigateNext() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
        this.renderCurrentView();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCurrentView();
    }

    // Helper methods
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    getStatusClass(status) {
        const statusMap = {
            'NOT_STARTED': 'not-started',
            'IN_PROGRESS': 'in-progress',
            'ON_HOLD': 'on-hold',
            'COMPLETED': 'completed',
            'CANCELED': 'canceled',
            'OVERDUE': 'overdue'
        };
        return statusMap[status] || 'not-started';
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

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoadingState() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('calendarContainer').style.display = 'none';
    }

    hideLoadingState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('calendarContainer').style.display = 'block';
    }

    showErrorState() {
        // Could implement error state display here
        console.error('Error loading calendar data');
    }
}

// Global Functions
function createTask() {
    window.location.href = 'task-create.html';
}

function createProject() {
    window.location.href = 'create-project.html';
}

function joinProject() {
    // Check if join project modal exists and show it
    if (typeof joinProjectModal !== 'undefined' && joinProjectModal) {
        joinProjectModal.show();
    } else {
        // Fallback: redirect to a join project page or show alert
        console.warn('Join project modal not available');
        const code = prompt('Nhập mã mời dự án:');
        if (code && code.trim()) {
            window.location.href = `project-details.html?invite=${encodeURIComponent(code.trim())}`;
        }
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

// Sidebar Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar && mainContent) {
        // Check if mobile view
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile behavior: toggle sidebar visibility
            sidebar.classList.toggle('expanded');
        } else {
            // Desktop behavior: toggle sidebar width
            sidebar.classList.toggle('expanded');
            sidebar.classList.toggle('collapsed');
            
            if (sidebar.classList.contains('collapsed')) {
                mainContent.style.marginLeft = '70px';
            } else {
                mainContent.style.marginLeft = '250px';
            }
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
            window.location.href = 'projects.html';
            break;
        case 'tasks':
            window.location.href = 'tasks.html';
            break;
        case 'calendar':
            // Already on calendar page
            break;
        default:
            console.log('Unknown page:', page);
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
let calendarManager;
document.addEventListener('DOMContentLoaded', () => {
    calendarManager = new CalendarManager();
    window.calendarManager = calendarManager;
});
