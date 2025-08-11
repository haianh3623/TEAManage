// ========== TAB NHIỆM VỤ CHO PROJECT MEMBER ==========
// Hàm fetch và render danh sách nhiệm vụ của thành viên trong dự án
async function fetchAndRenderMemberTasks() {
    const userId = window._projectMemberUserId;
    const projectId = window._projectMemberProjectId;
    if (!userId || !projectId) return;
    const container = document.getElementById('memberTasksTabContent');
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border"></div><p>Đang tải danh sách nhiệm vụ...</p></div>';
    try {
        const tasks = await apiClient.get(`/tasks?projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`);
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-4">Không có nhiệm vụ nào.</div>';
            return;
        }
        container.innerHTML = tasks.map(task => renderMemberTaskCard(task)).join('');
        // Gán sự kiện click cho từng card nhiệm vụ
        setTimeout(() => {
            document.querySelectorAll('.member-task-card').forEach(card => {
                card.addEventListener('click', function() {
                    const taskId = this.getAttribute('data-task-id');
                    if (taskId) {
                        window.location.href = `task-details.html?id=${encodeURIComponent(taskId)}`;
                    }
                });
            });
        }, 0);
    } catch (err) {
        container.innerHTML = '<div class="text-danger text-center py-4">Lỗi khi tải danh sách nhiệm vụ.</div>';
    }
}

// Hàm render 1 card nhiệm vụ (tương tự project-details)
function renderMemberTaskCard(task) {
    const statusMap = {
        'PENDING': { text: 'Chờ xử lý', class: 'warning' },
        'IN_PROGRESS': { text: 'Đang làm', class: 'primary' },
        'COMPLETED': { text: 'Hoàn thành', class: 'success' },
        'REJECTED': { text: 'Từ chối', class: 'danger' },
        'CANCELLED': { text: 'Đã huỷ', class: 'secondary' }
    };
    const status = statusMap[task.status] || { text: task.status, class: 'secondary' };
    return `
        <div class="card mb-3 shadow-sm member-task-card" data-task-id="${task.id}" style="cursor:pointer;">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${escapeHtml(task.title)}</h6>
                    <span class="badge bg-${status.class}">${status.text}</span>
                </div>
                <div class="mb-2 text-muted" style="font-size:0.95em">
                    <i class="bi bi-calendar-event me-1"></i> Deadline: ${task.deadline ? formatDate(task.deadline) : '--'}
                </div>
                <div class="mb-2">
                    <b>Mô tả:</b> ${escapeHtml(task.description) || '<span class=\"text-muted\">(Không có)</span>'}
                </div>
            </div>
        </div>
    `;
}

// Gọi hàm fetchAndRenderMemberTasks khi chuyển sang tab nhiệm vụ
document.addEventListener('DOMContentLoaded', function() {
    const tabBtn = document.getElementById('memberTasksTabBtn');
    if (tabBtn) {
        tabBtn.addEventListener('click', fetchAndRenderMemberTasks);
        // Nếu tab nhiệm vụ đang là active mặc định thì gọi luôn khi load trang
        if (tabBtn.classList.contains('active')) {
            fetchAndRenderMemberTasks();
        }
    }
});
// project-member.js
// Hiển thị thông tin thành viên dự án và log hoạt động

// Helper: format ngày
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const time = new Date(dateStr);
    const diffInSeconds = Math.floor((now - time) / 1000);
    if (diffInSeconds < 60) return 'vừa xong';
    if (diffInSeconds < 3600) return Math.floor(diffInSeconds/60) + ' phút trước';
    if (diffInSeconds < 86400) return Math.floor(diffInSeconds/3600) + ' giờ trước';
    if (diffInSeconds < 2592000) return Math.floor(diffInSeconds/86400) + ' ngày trước';
    return time.toLocaleDateString('vi-VN');
}

function getRoleText(role) {
    const map = { 'LEADER': 'Trưởng nhóm', 'VICE_LEADER': 'Phó nhóm', 'MEMBER': 'Thành viên' };
    return map[role] || role || '--';
}

function getInitials(firstName, lastName) {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// Lấy param từ URL
function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

async function fetchMemberInfo() {
    const memberId = getParam('memberId');
    const projectId = getParam('projectId');
    if (!memberId || !projectId) {
        alert('Thiếu thông tin thành viên hoặc dự án!');
        return;
    }
    // Lấy member từ project
    let member = null;
    let memberRole = '--';
    let email = null;
    try {
        const project = await apiClient.get(`/projects/${projectId}`);
        
        console.log('🔍 Fetched project:', project);
        console.log(project.members);

        member = (project.members || project.projectMembers || []).find(m => String(m.id) === String(memberId));
        if (member) {
            console.log('🔍 Found member:', member);
            memberRole = getRoleText(member.role);
            email = member.email || member.userEmail;
            console.log('🔍 Member email:', email);
        }
    } catch {}
    if (!email) {
        alert('Không tìm thấy email thành viên!');
        return;
    }
    // Lấy thông tin user
    let user = null;
    try {
        user = await apiClient.get(`/users/email?email=${encodeURIComponent(email)}`);
    } catch {
        alert('Không thể tải thông tin người dùng!');
        return;
    }
    // Hiển thị thông tin
    document.getElementById('memberAvatar').textContent = getInitials(user.firstName, user.lastName);
    document.getElementById('memberFullName').textContent = `${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}`;
    document.getElementById('memberEmail').textContent = user.email;
    document.getElementById('memberPhone').textContent = user.phoneNumber || '--';
    document.getElementById('memberDob').textContent = formatDate(user.dob);
    document.getElementById('memberRole').textContent = memberRole;
    // Lưu userId, projectId để fetch activity
    window._projectMemberUserId = user.id;
    window._projectMemberProjectId = projectId;
}

async function fetchAndRenderActivityLog() {
    const userId = window._projectMemberUserId;
    const projectId = window._projectMemberProjectId;
    if (!userId || !projectId) return;
    const filter = document.getElementById('activityTimeFilter').value;
    let fromDate = null;
    if (filter === '1d') {
        fromDate = new Date(Date.now() - 24*60*60*1000);
    } else if (filter === '1w') {
        fromDate = new Date(Date.now() - 7*24*60*60*1000);
    } else if (filter === '1m') {
        fromDate = new Date(Date.now() - 30*24*60*60*1000);
    }
    let url = `/user-activity?userId=${userId}&projectId=${projectId}`;
    let activities = [];
    try {
        activities = await apiClient.get(url);
        if (fromDate) {
            activities = activities.filter(a => new Date(a.timestamp) >= fromDate);
        }
    } catch {
        document.getElementById('activityList').innerHTML = '<div class="empty-state">Không thể tải hoạt động.</div>';
        return;
    }
    renderActivityList(activities);
}

function getActionIcon(action) {
    const map = {
        'created_task': 'bi-check-square',
        'updated_project': 'bi-pencil',
        'completed_task': 'bi-check-circle',
        'joined_project': 'bi-person-plus',
        'uploaded_file': 'bi-upload',
        'created_comment': 'bi-chat',
    };
    return map[action] || 'bi-activity';
}

function renderActivityList(activities) {
    const container = document.getElementById('activityList');
    if (!activities || activities.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-activity"></i><h5>Chưa có hoạt động</h5><p>Hoạt động sẽ hiển thị khi thành viên thực hiện các hành động.</p></div>`;
        return;
    }
    const html = activities.map(activity => `
        <div class="activity-item">
            <div class="d-flex align-items-center gap-2 mb-1">
                <i class="bi ${getActionIcon(activity.action)} text-primary fs-5"></i>
                <span class="fw-semibold">${escapeHtml(activity.action || 'Hoạt động')}</span>
                <span class="text-muted small ms-auto">${formatRelativeTime(activity.timestamp)}</span>
            </div>
            <div class="text-secondary ms-4">${escapeHtml(activity.description || '')}</div>
        </div>
    `).join('');
    container.innerHTML = html;
}

// Sự kiện filter
function setupActivityFilter() {
    const filter = document.getElementById('activityTimeFilter');
    if (filter) {
        filter.addEventListener('change', fetchAndRenderActivityLog);
    }
}

// Khởi tạo
window.addEventListener('DOMContentLoaded', async () => {
    await fetchMemberInfo();
    setupActivityFilter();
    await fetchAndRenderActivityLog();
    // Luôn gọi hàm load nhiệm vụ khi vào trang
    fetchAndRenderMemberTasks();
});

// Notification, profile, logout (tái sử dụng từ project-details)
function viewProfile() { window.location.href = 'profile.html'; }
function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        authUtils.logout();
        window.location.href = 'auth.html';
    }
}
