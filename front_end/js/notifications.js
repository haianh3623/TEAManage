/**
 * Notification Service - Quản lý thông báo real-time với WebSocket
 */
class NotificationService {
    constructor() {
        this.stompClient = null;
        this.isConnected = false;
        this.notifications = [];
        this.unreadCount = 0;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * Khởi tạo các elements DOM
     */
    initializeElements() {
        this.notificationBadge = document.querySelector('.notification-badge');
        this.notificationCount = document.querySelector('.notification-count');
        this.notificationDropdown = document.querySelector('.notification-dropdown');
        this.notificationList = document.querySelector('.notification-list');
        this.markAllReadBtn = document.querySelector('.mark-all-read-btn');
        
        // Tạo elements nếu chưa có
        if (!this.notificationCount) {
            this.createNotificationCount();
        }
        if (!this.notificationDropdown) {
            this.createNotificationDropdown();
        }
    }

    /**
     * Tạo notification count badge
     */
    createNotificationCount() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const countSpan = document.createElement('span');
            countSpan.className = 'notification-count';
            countSpan.style.display = 'none';
            countSpan.textContent = '0';
            badge.appendChild(countSpan);
            this.notificationCount = countSpan;
        }
    }

    /**
     * Tạo notification dropdown
     */
    createNotificationDropdown() {
        const dropdown = document.querySelector('.navbar-right .dropdown');
        if (dropdown) {
            const dropdownMenu = dropdown.querySelector('.dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.className = 'dropdown-menu dropdown-menu-end notification-dropdown';
                dropdownMenu.innerHTML = `
                    <div class="notification-header">
                        <h6 class="mb-0">Thông báo</h6>
                        <button class="btn btn-sm btn-link mark-all-read-btn" type="button">
                            Đánh dấu đã đọc
                        </button>
                    </div>
                    <div class="notification-list">
                        <div class="loading-notifications">
                            <div class="spinner-border spinner-border-sm" role="status"></div>
                            <span class="ms-2">Đang tải...</span>
                        </div>
                    </div>
                `;
                
                this.notificationDropdown = dropdownMenu;
                this.notificationList = dropdownMenu.querySelector('.notification-list');
                this.markAllReadBtn = dropdownMenu.querySelector('.mark-all-read-btn');
            }
        }
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Mark all as read
        if (this.markAllReadBtn) {
            this.markAllReadBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // Auto connect when user is authenticated
        document.addEventListener('DOMContentLoaded', () => {
            // Add delay to ensure libraries are loaded
            setTimeout(() => {
                const token = localStorage.getItem('token');
                if (token) {
                    this.userId = this.getUserIdFromToken(token);
                    if (this.userId) {
                        console.log('🔄 Auto-connecting for user:', this.userId);
                        this.connect();
                        this.loadNotifications();
                    }
                }
            }, 500);
        });
    }

    /**
     * Kết nối WebSocket
     */
    connect() {
        if (this.isConnected) return;

        // Check if required libraries are loaded
        if (typeof SockJS === 'undefined') {
            console.error('❌ SockJS library not loaded');
            return;
        }
        
        if (typeof Stomp === 'undefined') {
            console.error('❌ Stomp library not loaded');
            return;
        }

        try {
            // Sử dụng đúng base URL của backend
            const socket = new SockJS('http://localhost:8080/ws');
            this.stompClient = Stomp.over(socket);
            
            // Tắt debug log
            this.stompClient.debug = null;
            
            this.stompClient.connect({}, 
                (frame) => {
                    console.log('✅ WebSocket connected:', frame);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Subscribe to user notifications
                    if (this.userId) {
                        this.subscribeToNotifications();
                    }
                },
                (error) => {
                    console.error('❌ WebSocket connection failed:', error);
                    this.isConnected = false;
                    // Don't auto-reconnect on initial connection failure
                    // this.handleReconnect();
                }
            );
        } catch (error) {
            console.error('❌ Error creating WebSocket connection:', error);
            this.handleReconnect();
        }
    }

    /**
     * Subscribe to notifications channel
     */
    subscribeToNotifications() {
        if (!this.stompClient || !this.isConnected || !this.userId) return;

        const channel = `/topic/notifications/${this.userId}`;
        console.log('🔔 Subscribing to:', channel);
        
        this.stompClient.subscribe(channel, (message) => {
            try {
                const notification = JSON.parse(message.body);
                console.log('📬 New notification received:', notification);
                this.handleNewNotification(notification);
            } catch (error) {
                console.error('❌ Error parsing notification:', error);
            }
        });
    }

    /**
     * Handle reconnection
     */
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Handle new notification
     */
    handleNewNotification(notification) {
        // Add to notifications array
        this.notifications.unshift(notification);
        
        // Update unread count
        if (!notification.isRead) {
            this.unreadCount++;
            this.updateNotificationCount();
        }
        
        // Update UI
        this.renderNotifications();
        
        // Show browser notification if permission granted
        this.showBrowserNotification(notification);
    }

    /**
     * Load existing notifications
     */
    async loadNotifications() {
        if (!this.userId) return;

        try {
            const response = await apiClient.get(`/notifications/unread/${this.userId}`);
            this.notifications = response || [];
            this.unreadCount = this.notifications.filter(n => !n.isRead).length;
            
            this.updateNotificationCount();
            this.renderNotifications();
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            // Don't show error immediately, backend might not be running
            this.renderEmptyState();
        }
    }

    /**
     * Render notifications in dropdown
     */
    renderNotifications() {
        if (!this.notificationList) return;

        if (this.notifications.length === 0) {
            this.notificationList.innerHTML = `
                <div class="empty-notifications">
                    <i class="bi bi-bell-slash"></i>
                    <div>Không có thông báo mới</div>
                </div>
            `;
            return;
        }

        const notificationsHtml = this.notifications.map(notification => 
            this.createNotificationItem(notification)
        ).join('');

        this.notificationList.innerHTML = notificationsHtml;
        
        // Bind click events
        this.bindNotificationEvents();
    }

    /**
     * Create notification item HTML
     */
    createNotificationItem(notification) {
        const icon = this.getNotificationIcon(notification.type, notification.relatedType);
        const time = this.formatRelativeTime(new Date(notification.createdAt));
        const unreadClass = !notification.isRead ? 'unread' : '';
        
        return `
            <div class="notification-item ${unreadClass}" data-id="${notification.id}" data-related-id="${notification.relatedId}" data-related-type="${notification.relatedType}">
                <div class="notification-content">
                    <div class="notification-icon ${icon.class}">
                        <i class="bi ${icon.icon}"></i>
                    </div>
                    <div class="notification-body">
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${time}</div>
                        ${!notification.isRead ? `
                            <div class="notification-actions">
                                <button class="btn btn-sm btn-outline-primary mark-read-btn" onclick="notificationService.markAsRead(${notification.id})">
                                    Đánh dấu đã đọc
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type, relatedType) {
        if (relatedType) {
            switch (relatedType.toLowerCase()) {
                case 'project':
                    return { class: 'project', icon: 'bi-folder' };
                case 'task':
                    return { class: 'task', icon: 'bi-check2-square' };
                case 'taskapprovallog':
                    return { class: 'approval', icon: 'bi-check-circle' };
                default:
                    return { class: 'default', icon: 'bi-bell' };
            }
        }
        
        switch (type) {
            case 'TASK_ASSIGNED':
                return { class: 'task', icon: 'bi-person-check' };
            case 'TASK_COMPLETED':
                return { class: 'task', icon: 'bi-check2-circle' };
            case 'PROJECT_INVITE':
                return { class: 'project', icon: 'bi-person-plus' };
            case 'DEADLINE_REMINDER':
                return { class: 'task', icon: 'bi-clock' };
            default:
                return { class: 'default', icon: 'bi-bell' };
        }
    }

    /**
     * Bind notification click events
     */
    bindNotificationEvents() {
        const notificationItems = this.notificationList.querySelectorAll('.notification-item');
        
        notificationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('mark-read-btn')) return;
                
                const notificationId = item.dataset.id;
                const relatedId = item.dataset.relatedId;
                const relatedType = item.dataset.relatedType;
                
                // Mark as read if unread
                if (item.classList.contains('unread')) {
                    this.markAsRead(parseInt(notificationId));
                }
                
                // Navigate to related content
                this.navigateToRelatedContent(relatedType, relatedId);
            });
        });
    }

    /**
     * Navigate to related content
     */
    navigateToRelatedContent(relatedType, relatedId) {
        if (!relatedType || !relatedId) return;
        
        switch (relatedType.toLowerCase()) {
            case 'project':
                window.location.href = `project-details.html?projectId=${relatedId}`;
                break;
            case 'task':
                window.location.href = `task-details.html?taskId=${relatedId}`;
                break;
            case 'taskapprovallog':
                // Thiết kế sau
                console.log('TaskApprovalLog navigation - to be implemented');
                break;
            default:
                console.log('Unknown related type:', relatedType);
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            await apiClient.put(`/notifications/${notificationId}/read`);
            
            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateNotificationCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            showToast('Có lỗi khi đánh dấu thông báo', 'error');
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        const unreadNotifications = this.notifications.filter(n => !n.isRead);
        
        try {
            // Mark all as read in parallel
            const promises = unreadNotifications.map(notification => 
                apiClient.put(`/notifications/${notification.id}/read`)
            );
            
            await Promise.all(promises);
            
            // Update local state
            this.notifications.forEach(notification => {
                notification.isRead = true;
            });
            
            this.unreadCount = 0;
            this.updateNotificationCount();
            this.renderNotifications();
            
            showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            showToast('Có lỗi khi đánh dấu thông báo', 'error');
        }
    }

    /**
     * Update notification count badge
     */
    updateNotificationCount() {
        if (!this.notificationCount) return;
        
        if (this.unreadCount > 0) {
            this.notificationCount.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.notificationCount.style.display = 'flex';
            this.notificationCount.classList.add('new');
            
            // Remove animation class after animation
            setTimeout(() => {
                this.notificationCount.classList.remove('new');
            }, 500);
        } else {
            this.notificationCount.style.display = 'none';
        }
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        
        const options = {
            body: notification.message,
            icon: '/images/team-logo.svg',
            badge: '/images/team-logo.svg',
            tag: `notification-${notification.id}`,
            silent: false
        };
        
        const browserNotification = new Notification('TEAManage', options);
        
        browserNotification.onclick = () => {
            window.focus();
            this.navigateToRelatedContent(notification.relatedType, notification.relatedId);
            browserNotification.close();
        };
        
        // Auto close after 5 seconds
        setTimeout(() => {
            browserNotification.close();
        }, 5000);
    }

    /**
     * Request notification permission
     */
    requestNotificationPermission() {
        if (!('Notification' in window)) return Promise.resolve('denied');
        
        return Notification.requestPermission();
    }

    /**
     * Get user ID from JWT token
     */
    getUserIdFromToken(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId || payload.id || payload.sub;
        } catch (error) {
            console.error('❌ Error parsing token:', error);
            return null;
        }
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        
        return date.toLocaleDateString('vi-VN');
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        if (!this.notificationList) return;
        
        this.notificationList.innerHTML = `
            <div class="empty-notifications">
                <i class="bi bi-bell-slash"></i>
                <div>Không có thông báo mới</div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        if (!this.notificationList) return;
        
        this.notificationList.innerHTML = `
            <div class="empty-notifications">
                <i class="bi bi-exclamation-triangle text-warning"></i>
                <div>Có lỗi khi tải thông báo</div>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="notificationService.loadNotifications()">
                    Thử lại
                </button>
            </div>
        `;
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.stompClient && this.isConnected) {
            this.stompClient.disconnect(() => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
            });
        }
    }

    /**
     * Update user context (when user logs in/out)
     */
    updateUser(userId) {
        const oldUserId = this.userId;
        this.userId = userId;
        
        if (userId && userId !== oldUserId) {
            // New user - reconnect and load notifications
            this.notifications = [];
            this.unreadCount = 0;
            this.updateNotificationCount();
            
            if (this.isConnected) {
                this.subscribeToNotifications();
            } else {
                this.connect();
            }
            
            this.loadNotifications();
        } else if (!userId) {
            // User logged out - clear notifications
            this.notifications = [];
            this.unreadCount = 0;
            this.updateNotificationCount();
            this.disconnect();
        }
    }
}

// Global instance
const notificationService = new NotificationService();

// Make it available globally
window.notificationService = notificationService;

// Auto initialize when auth changes
document.addEventListener('authStateChanged', (event) => {
    const { isAuthenticated, user } = event.detail;
    if (isAuthenticated && user) {
        notificationService.updateUser(user.id);
        // Request notification permission
        notificationService.requestNotificationPermission();
    } else {
        notificationService.updateUser(null);
    }
});

// Debug log
console.log('🔔 NotificationService loaded and available globally');
