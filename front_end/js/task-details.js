// Hiển thị modal chi tiết submission
async function showSubmissionLogModal(logId) {
    try {
        const modal = new bootstrap.Modal(document.getElementById('submissionLogModal'));
        const body = document.getElementById('submissionLogModalBody');
        const footer = document.getElementById('submissionLogModalFooter');
        body.innerHTML = `<div class="text-center py-4"><div class="spinner-border" role="status"></div><p class="mt-2">Đang tải chi tiết submission...</p></div>`;
        footer.innerHTML = '';

        // Lấy submission đã render (cache tạm trên window)
        const submissions = window.taskDetailsManager && window.taskDetailsManager._lastRenderedSubmissions;
        const submission = submissions && submissions.find(s => String(s.id) === String(logId));
        if (!submission) {
            body.innerHTML = `<div class="text-danger text-center py-4">Không tìm thấy dữ liệu submission.</div>`;
            footer.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>`;
            modal.show();
            return;
        }

        const submitterName = submission.submittedBy ? `${submission.submittedBy.firstName || ''} ${submission.submittedBy.lastName || ''}`.trim() || submission.submittedBy.email || `User #${submission.submittedBy.id}` : 'Unknown User';
        const submittedTime = new Date(submission.submittedAt).toLocaleString('vi-VN');
        const statusClass = {
            'PENDING': 'warning',
            'APPROVED': 'success',
            'REJECTED': 'danger'
        }[submission.status] || 'secondary';
        const statusText = {
            'PENDING': 'Chờ duyệt',
            'APPROVED': 'Đã duyệt',
            'REJECTED': 'Từ chối',
            'SUBMIT': 'Đã nộp'
        }[submission.status] || submission.status;
        const attachmentsHtml = submission.attachments && submission.attachments.length > 0
            ? submission.attachments.map(file => {
                const safeFileName = file && (file.fileName || file.name) ? (file.fileName || file.name) : '';
                const safeFileSize = file && (file.fileSize || file.size) ? (file.fileSize || file.size) : 0;
                const icon = safeFileName ? taskDetailsManager.getFileIcon(safeFileName) : 'bi-file-earmark';
                const fileId = file.id || file.fileId || file._id;
                return `
                    <div class="attachment-item mb-2 d-flex align-items-center">
                        <i class="bi ${icon} me-2"></i>
                        <span class="flex-grow-1">${safeFileName || 'Không rõ tên file'}</span>
                        <small class="text-muted ms-2">(${taskDetailsManager.formatFileSize(safeFileSize)})</small>
                        <button class="btn btn-link btn-sm ms-2 p-0 download-file-btn" title="Tải xuống" data-file-id="${fileId}"><i class="bi bi-download"></i></button>
                        <button class="btn btn-link btn-sm ms-1 p-0 text-danger delete-file-btn" title="Xoá file" data-file-id="${fileId}"><i class="bi bi-trash"></i></button>
                    </div>
                `;
            }).join('')
            : '<p class="text-muted mb-0">Không có file đính kèm</p>';

        body.innerHTML = `
            <div class="submission-modal-detail">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div><b>Người nộp:</b> ${taskDetailsManager.escapeHtml(submitterName)}</div>
                    <span class="badge bg-${statusClass} fs-6">${statusText}</span>
                </div>
                <div class="mb-2"><b>Thời gian nộp:</b> ${submittedTime}</div>
                <div class="mb-2"><b>Mô tả:</b><br>${submission.description ? taskDetailsManager.escapeHtml(submission.description) : '<span class="text-muted">(Không có)</span>'}</div>
                <div class="mb-2"><b>Phản hồi:</b><br>${submission.feedback ? `<span class='text-success'>${taskDetailsManager.escapeHtml(submission.feedback)}</span>` : '<span class="text-muted">(Không có)</span>'}</div>
                <div class="mb-2"><b>File đính kèm:</b><br>${attachmentsHtml}</div>
                <div id="submission-modal-actions" class="mt-3"></div>
            </div>
        `;
        footer.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>`;
        modal.show();
        // Hiển thị nút duyệt/từ chối nếu trạng thái là SUBMIT và user có quyền
        if (submission.status === 'SUBMIT' || submission.status === 'PENDING') {
            // Lấy quyền user hiện tại từ taskDetailsManager.currentUser.projectRole
            let role = '';
            if (window.taskDetailsManager && window.taskDetailsManager.currentUser) {
                role = (window.taskDetailsManager.currentUser.projectRole || window.taskDetailsManager.currentUser.role || '').toUpperCase();
            }
            if (role === 'LEADER' || role === 'VICE_LEADER') {
                const actionsDiv = document.getElementById('submission-modal-actions');
                actionsDiv.innerHTML = `
                    <button class="btn btn-success me-2" id="modal-approve-btn"><i class="bi bi-check-circle me-1"></i>Chấp nhận</button>
                    <button class="btn btn-danger" id="modal-reject-btn"><i class="bi bi-x-circle me-1"></i>Từ chối</button>
                `;
                // Gán sự kiện
                document.getElementById('modal-approve-btn').onclick = function() {
                    taskDetailsManager.approveSubmission(submission.id);
                    modal.hide();
                };
                document.getElementById('modal-reject-btn').onclick = function() {
                    taskDetailsManager.rejectSubmission(submission.id);
                    modal.hide();
                };
            }
        }
        // Gán sự kiện cho nút tải xuống và xoá file sau khi render
        setTimeout(() => {
            // Nút tải xuống
            document.querySelectorAll('#submissionLogModal .download-file-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const fileId = this.getAttribute('data-file-id');
                    if (fileId) {
                        window.open(`/api/files/download/${fileId}`, '_blank');
                    }
                });
            });
            // Nút xoá file
            document.querySelectorAll('#submissionLogModal .delete-file-btn').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    const fileId = this.getAttribute('data-file-id');
                    if (fileId && confirm('Bạn có chắc muốn xoá file này?')) {
                        try {
                            const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
                            if (res.ok) {
                                showNotification('Đã xoá file thành công!', 'success');
                                // Xoá file khỏi UI
                                this.closest('.attachment-item').remove();
                            } else {
                                showNotification('Xoá file thất bại!', 'error');
                            }
                        } catch (err) {
                            showNotification('Lỗi khi xoá file!', 'error');
                        }
                    }
                });
            });
        }, 0);
    } catch (err) {
        document.getElementById('submissionLogModalBody').innerHTML = `<div class="text-danger text-center py-4">Lỗi tải chi tiết submission.</div>`;
        document.getElementById('submissionLogModalFooter').innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>`;
    }
}
// --- Assign Member Modal Logic ---
let assignMemberProjectMembers = [];
let selectedAssignees = [];

function showAssignMemberModal() {
    const modal = new bootstrap.Modal(document.getElementById('assignMemberModal'));
    document.getElementById('assignMemberInput').value = '';
    document.getElementById('assignMemberDropdown').innerHTML = '';
    selectedAssignees = [];
    updateSelectedAssigneesList();
    fetchProjectMembersForAssign();
    modal.show();
}


function fetchProjectMembersForAssign() {
    // Lấy từ project đã fetch sẵn trong taskDetailsManager
    assignMemberProjectMembers = (window.taskDetailsManager && window.taskDetailsManager.currentProject && Array.isArray(window.taskDetailsManager.currentProject.members))
        ? window.taskDetailsManager.currentProject.members
        : [];
}

document.getElementById('assignMemberInput').addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    const dropdown = document.getElementById('assignMemberDropdown');
    if (!query || !assignMemberProjectMembers.length) {
        dropdown.innerHTML = '';
        return;
    }
    // Lấy danh sách userId đã được giao nhiệm vụ
    const assignedUsers = (window.taskDetailsManager && window.taskDetailsManager.currentTask && Array.isArray(window.taskDetailsManager.currentTask.assignedUsers))
        ? window.taskDetailsManager.currentTask.assignedUsers : [];
    // Lọc: chỉ hiển thị member chưa được giao (so sánh member.userId với userId của từng assignedUser)
    const filtered = assignMemberProjectMembers.filter(m => {
        const matchQuery = (m.firstName && m.firstName.toLowerCase().includes(query)) ||
            (m.lastName && m.lastName.toLowerCase().includes(query)) ||
            (m.email && m.email.toLowerCase().includes(query));
        if (!matchQuery) return false;
        if (selectedAssignees.some(s => s.id === m.id)) return false;
        // Nếu member.userId đã có trong assignedUsers (so sánh userId hoặc id), loại bỏ
        if (!m.userId) return true; // Nếu không có userId thì vẫn cho hiển thị (tránh loại nhầm)
        const alreadyAssigned = assignedUsers.some(u => (u.userId && u.userId === m.userId) || (u.id && u.id === m.userId));
        return !alreadyAssigned;
    });
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item text-muted">Không tìm thấy thành viên</div>';
        return;
    }
    dropdown.innerHTML = filtered.map(m => {
        const name = ((m.firstName||'') + ' ' + (m.lastName||'')).trim() || m.email || `User #${m.id}`;
        const initials = getInitials(name);
        const role = m.role ? `<span class='assign-member-role'>${escapeHtml(m.role)}</span>` : '';
        return `<div class="assign-member-suggestion" data-id="${m.id}">
            <span class="assign-member-avatar" style="background:${stringToColor(name)}">${initials}</span>
            <span class="assign-member-info">
                <span class="assign-member-name">${escapeHtml(name)}</span>
                <span class="assign-member-email">${escapeHtml(m.email||'')}</span> ${role}
            </span>
        </div>`;
    }).join('');
    document.querySelectorAll('.assign-member-suggestion').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const member = assignMemberProjectMembers.find(m => m.id == id);
            if (member && !selectedAssignees.some(s => s.id === member.id)) {
                selectedAssignees.push(member);
                updateSelectedAssigneesList();
                document.getElementById('assignMemberInput').value = '';
                dropdown.innerHTML = '';
            }
        });
    });
});

function updateSelectedAssigneesList() {
    const list = document.getElementById('selectedAssigneesList');
    if (!selectedAssignees.length) {
        list.innerHTML = '<div class="text-muted">Chưa chọn thành viên nào</div>';
        return;
    }
    list.innerHTML = selectedAssignees.map((m, idx) => {
        const name = ((m.firstName||'') + ' ' + (m.lastName||'')).trim() || m.email || `User #${m.id}`;
        const initials = getInitials(name);
        const role = m.role ? `<span class='selected-member-role'>${escapeHtml(m.role)}</span>` : '';
        return `<div class="selected-member-item">
            <span class="selected-member-avatar" style="background:${stringToColor(name)}">${initials}</span>
            <span class="selected-member-info">
                <span class="selected-member-name">${escapeHtml(name)}</span>
                <span class="selected-member-email">${escapeHtml(m.email||'')}</span> ${role}
            </span>
            <button type="button" class="btn btn-sm btn-link ms-auto" onclick="removeSelectedAssignee(${idx})"><i class="bi bi-x"></i></button>
        </div>`;
    }).join('');
}
// Helper: Lấy chữ cái đầu cho avatar
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}
// Helper: Sinh màu nền avatar từ tên
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 80%)`;
    return color;
}

function removeSelectedAssignee(idx) {
    selectedAssignees.splice(idx, 1);
    updateSelectedAssigneesList();
}

document.getElementById('assignMemberForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!selectedAssignees.length) return;
    const taskId = window.taskDetailsManager?.currentTask?.id;
    if (!taskId) return;
    try {
        // Giao nhiệm vụ cho các thành viên đã chọn
        await apiClient.post(`/tasks/${taskId}/assign`, selectedAssignees.map(m => m.id));
        showNotification('Giao nhiệm vụ thành công!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('assignMemberModal')).hide();
        // Reload assignees tab
        if (window.taskDetailsManager) window.taskDetailsManager.loadAssignees();
    } catch (e) {
        showNotification('Lỗi khi giao nhiệm vụ: ' + (e?.message || ''), 'danger');
    }
});
async function loadSubmissionsTab(taskId) {
    const submissionsContent = document.getElementById('submissionsContent');
    submissionsContent.innerHTML = `<div class="loading-spinner text-center py-5">
        <div class="spinner-border" role="status">
            <span class="visually-hidden">Đang tải...</span>
        </div>
        <p class="mt-2">Đang tải submissions...</p>
    </div>`;

    try {
        // Đúng endpoint: /task-approvals/task/{taskId}
        const response = await apiClient.request({
            url: `/task-approvals/task/${taskId}`,
            method: 'GET',
        });
        const logs = response.data;
        if (!logs || logs.length === 0) {
            submissionsContent.innerHTML = `<div class="text-center py-4 text-muted">Chưa có submission nào.</div>`;
            return;
        }
        submissionsContent.innerHTML = '';
        logs.forEach(log => {
            const logDiv = document.createElement('div');
            logDiv.className = 'submission-log-item card mb-3';
            logDiv.innerHTML = `
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <div><b>${log.userName || 'Người dùng'}</b> <span class="text-muted">(${log.userEmail || ''})</span></div>
                        <div class="text-muted small">${formatDateTime(log.createdAt)}</div>
                    </div>
                    <button class="btn btn-outline-primary btn-sm view-log-btn" data-log-id="${log.id}">Xem chi tiết</button>
                </div>
            `;
            submissionsContent.appendChild(logDiv);
        });
        // Gán sự kiện xem chi tiết
        document.querySelectorAll('.view-log-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const logId = this.getAttribute('data-log-id');
                showSubmissionLogModal(logId);
            });
        });
    } catch (error) {
        submissionsContent.innerHTML = `<div class="text-danger text-center py-4">Lỗi tải submissions.</div>`;
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN');
}
// --- File upload logic for submit modal (giống create-project) ---
let submitSelectedFiles = [];

function openSubmitFileDialog() {
    document.getElementById('submitFiles').click();
}

document.getElementById('submitFiles').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (!validateSubmitFile(file)) return;
        if (isDuplicateSubmitFile(file)) {
            showSubmitTaskAlert(`File "${file.name}" đã được thêm.`, 'warning');
            return;
        }
        submitSelectedFiles.push(file);
    });
    updateSubmitFileDisplay();
    this.value = '';
});

function validateSubmitFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        showSubmitTaskAlert(`File "${file.name}" quá lớn. Vui lòng chọn file nhỏ hơn 10MB.`, 'error');
        return false;
    }
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        showSubmitTaskAlert(`File "${file.name}" không được hỗ trợ. Vui lòng chọn file có định dạng: ${allowedExtensions.join(', ')}`, 'error');
        return false;
    }
    return true;
}

function isDuplicateSubmitFile(file) {
    return submitSelectedFiles.some(f => f.name === file.name && f.size === file.size);
}

function updateSubmitFileDisplay() {
    const filePreview = document.getElementById('submitFilePreview');
    const fileList = document.getElementById('submitFileList');
    if (submitSelectedFiles.length > 0) {
        filePreview.classList.add('has-files');
        const filesHtml = submitSelectedFiles.map((file, index) => `
            <div class="file-item" data-index="${index}">
                <div class="file-info">
                    <i class="bi ${getSubmitFileIcon(file.name)} file-icon"></i>
                    <div>
                        <div class="file-name">${escapeHtml(file.name)}</div>
                        <div class="file-size">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button type="button" class="remove-file" onclick="removeSubmitFile(${index})" title="Xóa file">
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

function removeSubmitFile(index) {
    submitSelectedFiles.splice(index, 1);
    updateSubmitFileDisplay();
}

function getSubmitFileIcon(fileName) {
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSubmitTaskAlert(msg, type = 'danger') {
    const alertBox = document.getElementById('submitTaskAlert');
    alertBox.textContent = msg;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('d-none');
}
// Hiển thị modal submit nhiệm vụ
function showSubmitTaskModal() {
    const modal = new bootstrap.Modal(document.getElementById('submitTaskModal'));
    document.getElementById('submitNote').value = '';
    document.getElementById('submitFiles').value = '';
    document.getElementById('submitTaskAlert').classList.add('d-none');
    modal.show();
}

// Xử lý submit nhiệm vụ (gửi note + upload file)
document.getElementById('submitTaskModalBtn').addEventListener('click', async function() {
    const note = document.getElementById('submitNote').value.trim();
    const files = submitSelectedFiles;
    const alertBox = document.getElementById('submitTaskAlert');
    alertBox.classList.add('d-none');
    const taskId = window.taskDetailsManager?.currentTask?.id;
    if (!taskId) {
        showSubmitTaskAlert('Không xác định được nhiệm vụ.', 'danger');
        return;
    }
    try {
        // 1. Gửi submit, note là requestParam
        let submitUrl = `/task-approvals/${taskId}/submit`;
        if (note) submitUrl += `?note=${encodeURIComponent(note)}`;
        const submitRes = await apiClient.post(submitUrl);
        const subId = submitRes && submitRes.id;
        // 2. Upload file nếu có và có subId
        if (files && files.length > 0 && subId) {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));
            // Thêm taskSubId vào formData (và query string)
            formData.append('taskSubId', subId);
            // Lấy auth header nếu có
            const headers = {};
            if (typeof authUtils !== 'undefined' && authUtils.isAuthenticated()) {
                Object.assign(headers, authUtils.getAuthHeader());
            }
            const response = await fetch('http://localhost:8080/api/files/upload', {
                method: 'POST',
                headers,
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            // Không cần xử lý kết quả upload ở đây
        }
        showSubmitTaskAlert('Submit thành công!', 'success');
        submitSelectedFiles = [];
        updateSubmitFileDisplay();
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('submitTaskModal')).hide();
        }, 1200);
    } catch (err) {
        showSubmitTaskAlert('Lỗi submit: ' + (err?.message || ''), 'danger');
    }
});
/**
 * Task Details Page JavaScript
 * Handles task details display, hierarchy, assignees, and settings
 */

class TaskDetailsManager {
    constructor() {
        this.taskId = null;
        this.currentTask = null;
        this.currentUser = null;
        this.taskHierarchy = [];
        this.activeTab = 'hierarchy';
        
        this.init();
    }

    init() {
        console.log('🚀 Initializing Task Details Manager');
        
        // Check authentication
        if (!authUtils.isAuthenticated()) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Get task ID from URL
        this.taskId = this.getTaskIdFromUrl();
        if (!this.taskId) {
            console.error('No task ID provided');
            this.showError('Không tìm thấy ID nhiệm vụ');
            return;
        }
        
        // Load current user
        this.loadCurrentUser();
        
        // Load task details
        this.loadTaskDetails();
        
        console.log('✅ Task Details Manager initialized');
    }

    getTaskIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadCurrentUser() {
        try {
            const savedUserInfo = authUtils.getUserInfo();
            if (savedUserInfo && savedUserInfo.id) {
                this.currentUser = savedUserInfo;
                this.updateUserDisplay();
                return;
            }

            this.currentUser = await apiClient.get('/users/profile');
            if (this.currentUser) {
                authUtils.saveUserInfo(this.currentUser);
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    }

    async loadUserProjectRole() {
        // Load user's role in this specific project for permission checking
        try {
            if (!this.currentUser || !this.currentTask?.projectId) return;
            
            console.log('📋 Loading user project role for project:', this.currentTask.projectId);
            
            // Get user's role in this specific project
            const projectMember = await apiClient.get(`/projects/${this.currentTask.projectId}/members/me`);

            const project = await apiClient.get(`/projects/${this.currentTask.projectId}`);
            const projectMembers = project.members || [];

            projectMembers.forEach(m => {
                if (m.email === this.currentUser.email) {
                    this.currentUser.projectRole = m.role;
                }
            });

            if (projectMember && projectMember.role) {
                this.currentUser.projectRole = projectMember.role;
                console.log('👤 User project role loaded:', projectMember.role);
            }
            
        } catch (error) {
            console.warn('Failed to load user project role:', error);
            // Fallback: try to get from user info if available
            if (this.currentUser.role) {
                this.currentUser.projectRole = this.currentUser.role;
            } else {
                // For testing purposes, assume user has LEADER role if they are logged in
                console.log('🧪 Using fallback role for testing');
                this.currentUser.projectRole = 'LEADER';
                console.log('👤 Fallback user role set to:', this.currentUser.projectRole);
            }
        }
        console.log('� Permission management disabled - all authenticated users have full access');
    }

    updateUserDisplay() {
        if (!this.currentUser) return;
        
        console.log('👤 Updating user display with data:', this.currentUser);
        
        // Handle UserDto structure with firstName, lastName, email
        let displayName = 'Unknown User';
        
        if (this.currentUser) {
            const firstName = this.currentUser.firstName || '';
            const lastName = this.currentUser.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            if (fullName) {
                displayName = fullName;
            } else if (this.currentUser.name) {
                // Fallback to name field if exists
                displayName = this.currentUser.name;
            } else if (this.currentUser.email) {
                // Fallback to email
                displayName = this.currentUser.email;
            } else {
                displayName = `User #${this.currentUser.id}`;
            }
        }
        
        console.log('👤 User display name set to:', displayName);
        
        const userDisplayElements = document.querySelectorAll('#userDisplayName, #userDisplayNameDropdown');
        userDisplayElements.forEach(el => {
            if (el) el.textContent = displayName;
        });
    }

    async loadTaskDetails() {
        try {
            this.showLoading();
            
            console.log(`📋 Loading task details for ID: ${this.taskId}`);
            
            // Load task details
            this.currentTask = await apiClient.get(`/tasks/${this.taskId}`);
            console.log('📋 Task details loaded:', this.currentTask);
            
            // Update task display
            this.updateTaskDisplay();
            
            // Load task creator info from /users/{id} endpoint
            if (this.currentTask.createdById) {
                await this.loadTaskCreator(this.currentTask.createdById);
            } else if (this.currentTask.createdBy && this.currentTask.createdBy.id) {
                // Fallback: if createdBy is UserDto object, extract id and fetch
                await this.loadTaskCreator(this.currentTask.createdBy.id);
            }
            
            // Load project info
            if (this.currentTask.projectId) {
                this.loadProjectInfo(this.currentTask.projectId);
            }
            
            // Load user's project role before checking permissions
            await this.loadUserProjectRole();
            
            // Check permissions and show appropriate buttons
            this.checkPermissions();
            
            // Load initial tab content
            this.loadTabContent(this.activeTab);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Failed to load task details:', error);
            this.hideLoading();
            this.showError('Không thể tải thông tin nhiệm vụ. Vui lòng thử lại.');
        }
    }

    updateTaskDisplay() {
        if (!this.currentTask) return;
        
        // Update basic info
        document.getElementById('taskTitle').textContent = this.currentTask.title || 'Không có tiêu đề';
        document.getElementById('taskDescription').textContent = this.currentTask.description || 'Không có mô tả';
        
        // Update status
        const statusElement = document.getElementById('taskStatus');
        statusElement.textContent = this.getStatusText(this.currentTask.status);
        statusElement.className = `meta-value status-badge ${this.getStatusClass(this.currentTask.status)}`;
        
        // Update priority
        const priorityElement = document.getElementById('taskPriority');
        priorityElement.textContent = this.getPriorityText(this.currentTask.priority);
        priorityElement.className = `meta-value priority-badge ${this.getPriorityClass(this.currentTask.priority)}`;
        
        // Update deadline
        const deadlineElement = document.getElementById('taskDeadline');
        if (this.currentTask.deadline) {
            const deadline = new Date(this.currentTask.deadline);
            deadlineElement.textContent = deadline.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            deadlineElement.textContent = 'Không có deadline';
        }
        
        // Update progress
        const progress = this.currentTask.progress || 0;
        document.getElementById('taskProgressBar').style.width = `${progress}%`;
        document.getElementById('taskProgressText').textContent = `${progress}%`;
        
        // Update page title
        document.title = `${this.currentTask.title} - TEAManage`;
    }

    updateTaskCreatorDisplay(creatorData) {
        console.log('👤 Updating task creator display with TaskDto data:', creatorData);
        
        let creatorName = 'Không xác định';
        
        if (creatorData) {
            // Handle UserDto structure from TaskDto
            const firstName = creatorData.firstName || '';
            const lastName = creatorData.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            if (fullName) {
                creatorName = fullName;
            } else if (creatorData.name) {
                // Fallback to name field if exists
                creatorName = creatorData.name;
            } else if (creatorData.email) {
                // Fallback to email if no name available
                creatorName = creatorData.email;
            } else {
                creatorName = `User #${creatorData.id}`;
            }
        }
        
        console.log('👤 Creator display name from TaskDto:', creatorName);
        document.getElementById('taskCreator').textContent = creatorName;
    }

    async loadTaskCreator(creatorId) {
        try {
            console.log(`👤 Loading task creator info for ID: ${creatorId}`);
            
            const creator = await apiClient.get(`/users/${creatorId}`);
            console.log('👤 Creator data received:', creator);
            
            // Handle UserDto structure with firstName, lastName, email, etc.
            let creatorName = 'Không xác định';
            
            if (creator) {
                // Try to construct full name from firstName and lastName
                const firstName = creator.firstName || '';
                const lastName = creator.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                
                if (fullName) {
                    creatorName = fullName;
                } else if (creator.name) {
                    // Fallback to name field if exists
                    creatorName = creator.name;
                } else if (creator.email) {
                    // Fallback to email if no name available
                    creatorName = creator.email;
                } else {
                    creatorName = `User #${creator.id || creatorId}`;
                }
            }
            
            console.log('👤 Creator display name:', creatorName);
            document.getElementById('taskCreator').textContent = creatorName;
            
            // Store creator info for permission checks
            this.currentTask.creatorInfo = creator;
            
        } catch (error) {
            console.warn('❌ Failed to load task creator:', error);
            document.getElementById('taskCreator').textContent = 'Không xác định';
            
            // Fallback: try to use embedded createdBy data if available
            if (this.currentTask.createdBy && typeof this.currentTask.createdBy === 'object') {
                console.log('🔄 Using fallback embedded createdBy data');
                this.updateTaskCreatorDisplay(this.currentTask.createdBy);
            }
        }
    }

    async loadProjectInfo(projectId) {
        try {
            const project = await apiClient.get(`/projects/${projectId}`);
            this.currentProject = project;
            const projectElement = document.getElementById('taskProject');
            projectElement.textContent = project.name;
            projectElement.style.cursor = 'pointer';
            projectElement.style.color = '#764BA2';
            projectElement.onclick = () => {
                window.location.href = `project-details.html?id=${projectId}`;
            };
        } catch (error) {
            console.warn('Failed to load project info:', error);
            document.getElementById('taskProject').textContent = 'Không xác định';
        }
    }

    checkPermissions() {
        if (!this.currentUser || !this.currentTask) {
            console.warn('⚠️ Missing user or task data for permission check');
            return;
        }
        
        console.log('🔒 Permission check - showing buttons for all authenticated users');
        
        // Show submit button for all users
        const submitBtn = document.getElementById('submitTaskBtn');
        if (submitBtn) {
            submitBtn.style.display = 'inline-flex';
            console.log('✅ Submit button shown');
        }
        
        // Show settings tab for all authenticated users
        const settingsTabBtn = document.getElementById('settingsTabBtn');
        if (settingsTabBtn) {
            settingsTabBtn.style.display = 'inline-flex';
            console.log('✅ Settings tab shown');
        } else {
            console.warn('⚠️ Settings tab button element not found');
        }
        
        // Show assign member button for all authenticated users
        const assignMemberBtn = document.getElementById('assignMemberBtn');
        if (assignMemberBtn) {
            assignMemberBtn.style.display = 'inline-flex';
            console.log('✅ Assign member button shown');
        } else {
            console.warn('⚠️ Assign member button element not found');
        }
        
        // Show submissions tab for all authenticated users
        const submissionsTabBtn = document.getElementById('submissionsTabBtn');
        if (submissionsTabBtn) {
            submissionsTabBtn.style.display = 'inline-flex';
            console.log('✅ Submissions tab shown');
        } else {
            console.warn('⚠️ Submissions tab button element not found');
        }
    }

    async loadTabContent(tabName) {
        this.activeTab = tabName;
        
        switch (tabName) {
            case 'hierarchy':
                await this.loadTaskHierarchy();
                break;
            case 'assignees':
                await this.loadAssignees();
                break;
            case 'files':
                await this.loadFiles();
                break;
            case 'activity':
                await this.loadActivity();
                break;
            case 'settings':
                await this.loadSettings();
                break;
            case 'submissions':
                await this.loadSubmissions();
                break;
        }
    }

    async loadTaskHierarchy() {
        try {
            const content = document.getElementById('hierarchyContent');
            content.innerHTML = `
                <div class="loading-spinner text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <p class="mt-2">Đang tải hệ thống nhiệm vụ...</p>
                </div>
            `;
            
            console.log('📊 Loading task hierarchy...');
            
            // Load root task and all related tasks
            const hierarchy = await apiClient.get(`/tasks/${this.taskId}/hierarchy`);
            this.taskHierarchy = hierarchy;
            
            console.log('📊 Task hierarchy loaded:', hierarchy);
            console.log('📊 Hierarchy structure:');
            hierarchy.forEach(task => {
                console.log(`  - Task #${task.id}: "${task.title}" (parent: ${task.parentId || 'none'})`);
            });
            
            this.renderTaskHierarchy();
            
        } catch (error) {
            console.error('Failed to load task hierarchy:', error);
            
            // Fallback: Create mock hierarchy data for testing UI
            console.log('🔄 Using mock hierarchy data for testing...');
            this.taskHierarchy = [
                {
                    id: parseInt(this.taskId),
                    title: this.currentTask?.title || 'Nhiệm vụ chính',
                    description: 'Nhiệm vụ gốc trong hệ thống',
                    status: 'IN_PROGRESS',
                    priority: 'HIGH',
                    progress: 65,
                    deadline: '2025-08-15T10:00:00',
                    parentId: null,
                    assignedUsers: [
                        { firstName: 'Nguyễn', lastName: 'Văn A' },
                        { firstName: 'Trần', lastName: 'Thị B' }
                    ]
                },
                {
                    id: parseInt(this.taskId) + 100,
                    title: 'Nhiệm vụ con 1',
                    description: 'Nhiệm vụ con đầu tiên',
                    status: 'COMPLETED',
                    priority: 'MEDIUM',
                    progress: 100,
                    deadline: '2025-08-10T10:00:00',
                    parentId: parseInt(this.taskId),
                    assignedUsers: [
                        { firstName: 'Nguyễn', lastName: 'Văn A' }
                    ]
                },
                {
                    id: parseInt(this.taskId) + 101,
                    title: 'Nhiệm vụ con 2',
                    description: 'Nhiệm vụ con thứ hai',
                    status: 'IN_PROGRESS',
                    priority: 'HIGH',
                    progress: 45,
                    deadline: '2025-08-20T10:00:00',
                    parentId: parseInt(this.taskId),
                    assignedUsers: [
                        { firstName: 'Trần', lastName: 'Thị B' },
                        { firstName: 'Lê', lastName: 'Văn C' }
                    ]
                },
                {
                    id: parseInt(this.taskId) + 102,
                    title: 'Nhiệm vụ con cấp 2',
                    description: 'Nhiệm vụ con của nhiệm vụ con',
                    status: 'NOT_STARTED',
                    priority: 'LOW',
                    progress: 0,
                    deadline: '2025-08-25T10:00:00',
                    parentId: parseInt(this.taskId) + 101,
                    assignedUsers: []
                }
            ];
            
            this.renderTaskHierarchy();
            
            // Also show a note about mock data
            const content = document.getElementById('hierarchyContent');
            const mockNote = document.createElement('div');
            mockNote.className = 'alert alert-info mt-3';
            mockNote.innerHTML = `
                <i class="bi bi-info-circle me-2"></i>
                <strong>Lưu ý:</strong> Đang hiển thị dữ liệu mẫu vì API chưa sẵn sàng. 
                Kết nối tới backend để xem dữ liệu thực tế.
            `;
            content.appendChild(mockNote);
        }
    }

    renderTaskHierarchy() {
        const content = document.getElementById('hierarchyContent');
        
        if (!this.taskHierarchy || this.taskHierarchy.length === 0) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-diagram-3 text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">Không có nhiệm vụ liên quan</p>
                </div>
            `;
            return;
        }
        
        // Find root task (parent of current task or current task if it's root)
        let rootTask = this.taskHierarchy.find(task => !task.parentId);
        if (!rootTask) {
            rootTask = this.taskHierarchy.find(task => task.id === parseInt(this.taskId));
        }
        
        content.innerHTML = `
            <style>
                .task-hierarchy-list {
                    overflow: visible !important;
                }
                .hierarchy-task-item {
                    overflow: visible !important;
                    position: relative !important;
                }
                .hierarchy-task-actions {
                    position: relative !important;
                    overflow: visible !important;
                    z-index: 1000;
                }
            </style>
            <div class="task-hierarchy-list">
                ${this.renderHierarchyList(this.taskHierarchy, rootTask?.id)}
            </div>
        `;
        
        // Ensure all hierarchy children are properly displayed
        this.initializeHierarchyDisplay();
    }

    initializeHierarchyDisplay() {
        // Make sure all expanded items have their children visible
        const expandedItems = document.querySelectorAll('.hierarchy-task-item.expanded');
        expandedItems.forEach(item => {
            const taskId = item.getAttribute('data-task-id');
            const childrenContainer = document.getElementById(`hierarchy-children-${taskId}`);
            if (childrenContainer) {
                childrenContainer.style.display = 'block';
            }
        });
        
        // FORCE hiển thị tất cả task children luôn, bất kể trạng thái expanded/collapsed
        const allChildrenContainers = document.querySelectorAll('.hierarchy-children, div[id^="hierarchy-children-"]');
        allChildrenContainers.forEach(container => {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.maxHeight = 'none';
            container.style.overflow = 'visible';
            container.style.position = 'static';
            
            // Loại bỏ mọi class có thể ẩn element
            container.classList.remove('d-none', 'hidden', 'collapsed-content');
            
            // Force hiển thị tất cả task items bên trong
            const childTasks = container.querySelectorAll('.hierarchy-task-item');
            childTasks.forEach(child => {
                child.style.display = 'block';
                child.style.visibility = 'visible';
                child.style.opacity = '1';
                child.classList.remove('d-none', 'hidden');
            });
        });
        
        // Additional check: loại bỏ mọi inline style có thể ẩn elements
        document.querySelectorAll('.hierarchy-task-item').forEach(item => {
            if (item.style.display === 'none') {
                item.style.display = 'block';
            }
        });
    }

    renderHierarchyList(allTasks, rootTaskId = null, level = 1) {
        console.log(`🔄 Rendering hierarchy level ${level}, rootTaskId: ${rootTaskId}, total tasks: ${allTasks.length}`);
        
        // Get tasks at this level
        const tasksAtLevel = allTasks.filter(task => {
            if (level === 1) {
                return !task.parentId || task.id === rootTaskId;
            }
            return task.parentId === rootTaskId;
        });
        
        console.log(`📋 Tasks at level ${level}:`, tasksAtLevel.map(t => `#${t.id} - ${t.title}`));
        
        if (tasksAtLevel.length === 0) return '';
        
        return tasksAtLevel.map(task => {
            const childTasks = allTasks.filter(t => t.parentId === task.id);
            const hasChildren = childTasks.length > 0;
            
            console.log(`📌 Task #${task.id} has ${childTasks.length} children:`, childTasks.map(c => `#${c.id} - ${c.title}`));
            
            return this.renderHierarchyTaskItem(task, allTasks, level, hasChildren);
        }).join('');
    }

    renderHierarchyTaskItem(task, allTasks, level = 1, hasChildren = false) {
        const isCurrentTask = task.id === parseInt(this.taskId);
        const statusClass = this.getStatusClass(task.status);
        const priorityClass = this.getPriorityClass(task.priority);
        
        const deadline = task.deadline ? 
            new Date(task.deadline).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) : 'Không có deadline';
        
        const assignedUsersHtml = task.assignedUsers && task.assignedUsers.length > 0 
            ? task.assignedUsers.slice(0, 3).map(user => 
                `<span class="user-avatar-mini" title="${user.firstName || ''} ${user.lastName || ''}">
                    ${this.getInitials(user.firstName + ' ' + user.lastName)}
                </span>`
              ).join('')
            : '<span class="text-muted no-assigned">Chưa giao</span>';
        
        const moreUsersCount = task.assignedUsers && task.assignedUsers.length > 3 
            ? `<span class="more-users">+${task.assignedUsers.length - 3}</span>` 
            : '';
        
        const childrenHtml = hasChildren 
            ? this.renderHierarchyList(allTasks, task.id, level + 1)
            : '';
        
        return `
            <div class="hierarchy-task-item ${isCurrentTask ? 'current-task' : ''} ${hasChildren ? 'has-children expanded' : ''}" 
                 data-task-id="${task.id}" 
                 data-level="${level}">
                
                <div class="hierarchy-task-content" onclick="taskDetailsManager.navigateToTask(${task.id})">
                    ${hasChildren ? `
                        <button class="hierarchy-expand-btn" onclick="event.stopPropagation(); taskDetailsManager.toggleHierarchyTask(${task.id})" id="hierarchy-expand-${task.id}">
                            <i class="bi bi-chevron-down"></i>
                        </button>
                    ` : '<div class="hierarchy-expand-placeholder"></div>'}
                    
                    <div class="hierarchy-task-main">
                        <div class="hierarchy-task-header">
                            <span class="hierarchy-task-id">#${task.id}</span>
                            <h6 class="hierarchy-task-title">${this.escapeHtml(task.title)}</h6>
                            <span class="hierarchy-level-badge">
                                <i class="bi bi-layers me-1"></i>L${level}
                            </span>
                        </div>
                        
                        <div class="hierarchy-task-meta">
                            <div class="hierarchy-meta-left">
                                <span class="hierarchy-deadline">
                                    <i class="bi bi-calendar3 me-1"></i>
                                    ${deadline}
                                </span>
                                <span class="hierarchy-progress">
                                    <i class="bi bi-graph-up me-1"></i>
                                    ${task.progress || 0}%
                                </span>
                            </div>
                            
                            <div class="hierarchy-meta-right">
                                <span class="priority-badge-mini priority-${priorityClass}">
                                    ${this.getPriorityText(task.priority)}
                                </span>
                                <span class="status-badge-mini status-${statusClass}">
                                    ${this.getStatusText(task.status)}
                                </span>
                            </div>
                        </div>
                        
                        <div class="hierarchy-task-assignees">
                            <div class="assignees-list">
                                ${assignedUsersHtml}
                                ${moreUsersCount}
                            </div>
                        </div>
                    </div>
                    
                    <div class="hierarchy-task-actions">
                        <button class="btn btn-sm btn-outline-primary hierarchy-action-btn" 
                                onclick="event.stopPropagation(); taskDetailsManager.quickEditTask(${task.id})" 
                                title="Chỉnh sửa nhanh">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </div>
                
                ${hasChildren ? `
                    <div class="hierarchy-children" id="hierarchy-children-${task.id}">
                        ${childrenHtml}
                    </div>
                ` : ''}
            </div>
        `;
    }

    navigateToTask(taskId) {
        if (taskId === parseInt(this.taskId)) {
            return; // Already on this task
        }
        window.location.href = `task-details.html?id=${taskId}`;
    }

    toggleHierarchyTask(taskId) {
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        const expandBtn = document.getElementById(`hierarchy-expand-${taskId}`);
        const childrenContainer = document.getElementById(`hierarchy-children-${taskId}`);
        
        if (taskItem && expandBtn && childrenContainer) {
            if (taskItem.classList.contains('expanded')) {
                // Collapse - chỉ thay đổi icon, KHÔNG ẩn children
                taskItem.classList.remove('expanded');
                taskItem.classList.add('collapsed');
                expandBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
            } else {
                // Expand
                taskItem.classList.remove('collapsed');
                taskItem.classList.add('expanded');
                expandBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
            }
            
            // LUÔN giữ children hiển thị bất kể trạng thái
            childrenContainer.style.display = 'block';
            childrenContainer.style.visibility = 'visible';
            childrenContainer.style.opacity = '1';
            childrenContainer.style.maxHeight = 'none';
            childrenContainer.style.overflow = 'visible';
            
            // Đảm bảo tất cả task items trong children cũng hiển thị
            const childTasks = childrenContainer.querySelectorAll('.hierarchy-task-item');
            childTasks.forEach(child => {
                child.style.display = 'block';
                child.style.visibility = 'visible';
                child.style.opacity = '1';
            });
        }
    }

    expandAllHierarchyTasks() {
        const allTaskItems = document.querySelectorAll('.hierarchy-task-item.has-children');
        allTaskItems.forEach(item => {
            const taskId = item.getAttribute('data-task-id');
            const expandBtn = document.getElementById(`hierarchy-expand-${taskId}`);
            const childrenContainer = document.getElementById(`hierarchy-children-${taskId}`);
            
            if (expandBtn && childrenContainer) {
                item.classList.remove('collapsed');
                item.classList.add('expanded');
                expandBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
                childrenContainer.style.display = 'block';
            }
        });
    }

    collapseAllHierarchyTasks() {
        const allTaskItems = document.querySelectorAll('.hierarchy-task-item.has-children');
        allTaskItems.forEach(item => {
            const taskId = item.getAttribute('data-task-id');
            const expandBtn = document.getElementById(`hierarchy-expand-${taskId}`);
            const childrenContainer = document.getElementById(`hierarchy-children-${taskId}`);
            
            if (expandBtn && childrenContainer) {
                item.classList.remove('expanded');
                item.classList.add('collapsed');
                expandBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
                childrenContainer.style.display = 'none';
            }
        });
    }

    quickEditTask(taskId) {
        // Quick edit functionality - navigate to task details
        console.log(`Quick edit task ${taskId}`);
        this.navigateToTask(taskId);
    }

    async loadAssignees() {
        try {
            const content = document.getElementById('assigneesContent');
            content.innerHTML = `
                <div class="loading-spinner text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <p class="mt-2">Đang tải danh sách thành viên...</p>
                </div>
            `;
            
            console.log('👥 Using assignedUsers from TaskDto:', this.currentTask?.assignedUsers);
            
            // Use assignedUsers from TaskDto instead of fetching separately
            const assignees = this.currentTask?.assignedUsers || [];
            this.renderAssignees(assignees);
            
        } catch (error) {
            console.error('Failed to load assignees:', error);
            document.getElementById('assigneesContent').innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-people text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">Không thể tải danh sách thành viên</p>
                </div>
            `;
        }
    }

    renderAssignees(assignees) {
        const content = document.getElementById('assigneesContent');
        
        if (!assignees || assignees.length === 0) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-people text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">Chưa có thành viên nào được giao nhiệm vụ này</p>
                </div>
            `;
            return;
        }
        
        const assigneesHtml = assignees.map(assignee => {
            // Handle UserDto structure
            let displayName = 'Unknown User';
            let initials = '?';
            
            if (assignee) {
                const firstName = assignee.firstName || '';
                const lastName = assignee.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                
                if (fullName) {
                    displayName = fullName;
                    initials = this.getInitials(fullName);
                } else if (assignee.name) {
                    displayName = assignee.name;
                    initials = this.getInitials(assignee.name);
                } else if (assignee.email) {
                    displayName = assignee.email;
                    initials = this.getInitials(assignee.email);
                } else {
                    displayName = `User #${assignee.id}`;
                    initials = 'U' + (assignee.id ? assignee.id.toString().slice(-1) : '?');
                }
            }
            
            return `
                <div class="assignee-card">
                    <div class="assignee-avatar">${initials}</div>
                    <div class="assignee-info">
                        <div class="assignee-name">${this.escapeHtml(displayName)}</div>
                        <div class="assignee-role">${assignee.role || 'Thành viên'}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = assigneesHtml;
    }

    async loadActivity() {
        try {
            const content = document.getElementById('activityContent');
            content.innerHTML = `
                <div class="loading-spinner text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <p class="mt-2">Đang tải lịch sử hoạt động...</p>
                </div>
            `;
            
            // Get creator name from fetched creator info or fallback to embedded data
            let creatorName = 'Không xác định';
            
            if (this.currentTask?.creatorInfo) {
                // Use fetched creator info
                const creator = this.currentTask.creatorInfo;
                const firstName = creator.firstName || '';
                const lastName = creator.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                
                if (fullName) {
                    creatorName = fullName;
                } else if (creator.name) {
                    creatorName = creator.name;
                } else if (creator.email) {
                    creatorName = creator.email;
                } else {
                    creatorName = `User #${creator.id}`;
                }
            } else if (this.currentTask?.createdBy && typeof this.currentTask.createdBy === 'object') {
                // Fallback to embedded createdBy data
                const creator = this.currentTask.createdBy;
                const firstName = creator.firstName || '';
                const lastName = creator.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                
                if (fullName) {
                    creatorName = fullName;
                } else if (creator.email) {
                    creatorName = creator.email;
                } else {
                    creatorName = `User #${creator.id}`;
                }
            }
            
            // Mock activity data with creator info
            const activities = [
                {
                    id: 1,
                    type: 'created',
                    title: 'Nhiệm vụ được tạo',
                    description: `Nhiệm vụ đã được tạo bởi ${creatorName}`,
                    time: this.currentTask?.createdAt || new Date().toISOString(),
                    icon: 'plus-circle'
                }
            ];
            
            this.renderActivity(activities);
            
        } catch (error) {
            console.error('Failed to load activity:', error);
            document.getElementById('activityContent').innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-activity text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">Không thể tải lịch sử hoạt động</p>
                </div>
            `;
        }
    }

    renderActivity(activities) {
        const content = document.getElementById('activityContent');
        
        if (!activities || activities.length === 0) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-activity text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">Chưa có hoạt động nào</p>
                </div>
            `;
            return;
        }
        
        const activitiesHtml = activities.map(activity => {
            const time = new Date(activity.time).toLocaleString('vi-VN');
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="bi bi-${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                        <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                        <div class="activity-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        content.innerHTML = activitiesHtml;
    }

    async loadFiles() {
        try {
            const content = document.getElementById('filesContent');
            content.innerHTML = `
                <div class="loading-spinner text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <p class="mt-2">Đang tải danh sách file...</p>
                </div>
            `;
            
            console.log('📁 Loading task files...');
            
            // Load files from API
            const files = await apiClient.get(`/files/task/${this.taskId}`);
            console.log('📁 API files response:', files);
            
            if (!files || files.length === 0) {
                content.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-file-earmark" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">Chưa có file đính kèm</h5>
                        <p class="text-muted">Hãy tải lên file đầu tiên cho nhiệm vụ này</p>
                        <button class="btn btn-primary" onclick="uploadFile()">
                            <i class="bi bi-cloud-upload me-2"></i>Tải lên file
                        </button>
                    </div>
                `;
                return;
            }
            
            const filesHtml = `
                <div class="files-list">
                    ${files.map(file => {
                        const safeFileName = file && (file.fileName || file.name) ? (file.fileName || file.name) : '';
                        return `
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-icon">
                                    <i class="bi ${this.getFileIcon(safeFileName)}"></i>
                                </div>
                                <div class="file-details">
                                    <div class="file-name">${safeFileName}</div>
                                    <div class="file-meta">
                                        <span><i class="bi bi-file-earmark me-1"></i>${this.formatFileSize(file.fileSize)}</span>
                                        <span><i class="bi bi-calendar me-1"></i>${this.formatDate(file.uploadedAt)}</span>
                                        <span><i class="bi bi-person me-1"></i>${file.uploadedBy?.fullName || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="file-actions">
                                <button class="btn btn-outline-primary btn-sm" onclick="downloadFile('${file.id}', '${safeFileName}')">
                                    <i class="bi bi-download"></i>
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="previewFile('${file.id}', '${safeFileName}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                                ${this.canManageFiles() ? `
                                    <button class="btn btn-outline-danger btn-sm" onclick="deleteFile('${file.id}', '${safeFileName}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            content.innerHTML = filesHtml;
            
        } catch (error) {
            console.error('❌ Error loading files:', error);
            const content = document.getElementById('filesContent');
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                    <h5 class="mt-3">Không thể tải danh sách file</h5>
                    <p class="text-muted">${error.message || 'Đã xảy ra lỗi khi tải file đính kèm'}</p>
                    <button class="btn btn-outline-primary" onclick="taskDetailsManager.loadFiles()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Thử lại
                    </button>
                </div>
            `;
        }
    }

    async loadSettings() {
        try {
            const content = document.getElementById('settingsContent');
            
            // Populate basic form with current task data
            if (this.currentTask) {
                document.getElementById('editTaskTitle').value = this.currentTask.title || '';
                document.getElementById('editTaskDescription').value = this.currentTask.description || '';
                document.getElementById('editTaskPriority').value = this.currentTask.priority || 'MEDIUM';
                document.getElementById('editTaskStatus').value = this.currentTask.status || 'NOT_STARTED';
                
                if (this.currentTask.deadline) {
                    const deadline = new Date(this.currentTask.deadline);
                    document.getElementById('editTaskDeadline').value = deadline.toISOString().slice(0, 16);
                }
            }
            
            console.log('✅ Settings loaded (without permissions management)');
            
        } catch (error) {
            console.error('❌ Error loading settings:', error);
        }
    }

    async loadSubmissions() {
        try {
            const content = document.getElementById('submissionsContent');
            content.innerHTML = `
                <div class="loading-spinner text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <p class="mt-2">Đang tải danh sách nộp bài...</p>
                </div>
            `;

            console.log('📝 [loadSubmissions] Bắt đầu load submissions');
            console.log('📝 [loadSubmissions] this.taskId:', this.taskId);
            console.log('📝 [loadSubmissions] currentUser:', this.currentUser);

            // Check if user is LEADER or VICE_LEADER
            const userRole = this.currentUser.projectRole || this.currentUser.role;
            const isProjectLeader = userRole === 'LEADER' || userRole === 'VICE_LEADER';
            console.log('📝 [loadSubmissions] userRole:', userRole, '| isProjectLeader:', isProjectLeader);

            if (!isProjectLeader) {
                console.warn('📝 [loadSubmissions] Không có quyền truy cập submissions');
                content.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-shield-lock text-warning" style="font-size: 3rem;"></i>
                        <h5 class="mt-3">Không có quyền truy cập</h5>
                        <p class="text-muted">Chỉ có Trưởng nhóm và Phó nhóm mới có thể xem danh sách nộp bài</p>
                    </div>
                `;
                return;
            }

            try {
                // Load logs from API (expecting array response)
                const logs = await apiClient.request('GET', `/task-approvals/task/${this.taskId}`);
                console.log('📝 [loadSubmissions] API response logs:', logs);
                if (!Array.isArray(logs)) {
                    console.error('📝 [loadSubmissions] API trả về không phải mảng:', logs);
                }
                // Map logs to submissions with required info
                const submissions = await Promise.all((Array.isArray(logs) ? logs : []).map(async (log, idx) => {
                    console.log(`📝 [loadSubmissions] Xử lý log #${idx}:`, log);
                    // 1. User
                    let user = null;
                    try {
                        user = await apiClient.get(`/users/${log.performedById}`);
                        console.log(`📝 [loadSubmissions] User info cho log #${idx}:`, user);
                    } catch (e) {
                        console.warn(`📝 [loadSubmissions] Lỗi lấy user cho log #${idx}:`, e);
                    }
                    // 2. Files
                    let attachments = [];
                    try {
                        attachments = await apiClient.get(`/files/task-submission/${log.id}`);
                        console.log(`📝 [loadSubmissions] Attachments cho log #${idx}:`, attachments);
                    } catch (e) {
                        console.warn(`📝 [loadSubmissions] Lỗi lấy attachments cho log #${idx}:`, e);
                    }
                    return {
                        id: log.id,
                        submittedBy: user,
                        submittedAt: log.createdAt,
                        status: log.action,
                        description: log.note,
                        feedback: log.feedback,
                        attachments: attachments
                    };
                }));
                console.log('📝 [loadSubmissions] submissions sau khi map:', submissions);
                this.renderSubmissions(submissions);
            } catch (error) {
                console.warn('❌ [loadSubmissions] Failed to load submissions from API:', error);
                content.innerHTML = `<div class="text-center py-5"><i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i><h5 class="mt-3">Không thể tải danh sách nộp bài</h5><p class="text-muted">Đã xảy ra lỗi khi tải danh sách nộp bài</p><button class="btn btn-outline-primary" onclick="taskDetailsManager.loadSubmissions()"><i class="bi bi-arrow-clockwise me-2"></i>Thử lại</button></div>`;
            }

        } catch (error) {
            console.error('❌ [loadSubmissions] Failed to load submissions:', error);
            document.getElementById('submissionsContent').innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                    <h5 class="mt-3">Không thể tải danh sách nộp bài</h5>
                    <p class="text-muted">Đã xảy ra lỗi khi tải danh sách nộp bài</p>
                    <button class="btn btn-outline-primary" onclick="taskDetailsManager.loadSubmissions()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Thử lại
                    </button>
                </div>
            `;
        }
    }

    renderSubmissions(submissions) {
    // Lưu submissions vào cache tạm để modal lấy lại khi cần
    window.taskDetailsManager._lastRenderedSubmissions = submissions;
        const content = document.getElementById('submissionsContent');
        
        if (!submissions || submissions.length === 0) {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-file-text text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">Chưa có ai nộp bài cho nhiệm vụ này</p>
                </div>
            `;
            return;
        }
        
        const submissionsHtml = submissions.map(submission => {
            const submitterName = submission.submittedBy ? 
                `${submission.submittedBy.firstName || ''} ${submission.submittedBy.lastName || ''}`.trim() || 
                submission.submittedBy.email || 
                `User #${submission.submittedBy.id}` : 
                'Unknown User';

            const submittedTime = new Date(submission.submittedAt).toLocaleString('vi-VN');

            const statusClass = {
                'PENDING': 'warning',
                'APPROVED': 'success', 
                'REJECTED': 'danger'
            }[submission.status] || 'secondary';

            const statusText = {
                'PENDING': 'Chờ duyệt',
                'APPROVED': 'Đã duyệt',
                'REJECTED': 'Từ chối'
            }[submission.status] || submission.status;

            const attachmentsHtml = submission.attachments && submission.attachments.length > 0 
                ? submission.attachments.map(file => {
                    const safeFileName = file && (file.fileName || file.name) ? (file.fileName || file.name) : '';
                    const safeFileSize = file && (file.fileSize || file.size) ? (file.fileSize || file.size) : 0;
                    const icon = safeFileName ? this.getFileIcon(safeFileName) : 'bi-file-earmark';
                    return `
                        <div class="attachment-item">
                            <i class="bi ${icon} me-2"></i>
                            <span>${safeFileName || 'Không rõ tên file'}</span>
                            <small class="text-muted ms-2">(${this.formatFileSize(safeFileSize)})</small>
                        </div>
                    `;
                }).join('')
                : '<p class="text-muted mb-0">Không có file đính kèm</p>';

            // Thêm nút xem chi tiết
            const viewDetailBtn = `<button class="btn btn-outline-primary btn-sm view-log-btn" data-log-id="${submission.id}">Xem chi tiết</button>`;

            return `
                <div class="submission-card card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="submission-header">
                                <h6 class="card-title mb-1">
                                    <i class="bi bi-person-circle me-2"></i>
                                    ${this.escapeHtml(submitterName)}
                                </h6>
                                <small class="text-muted">
                                    <i class="bi bi-clock me-1"></i>
                                    Nộp lúc: ${submittedTime}
                                </small>
                            </div>
                            <span class="badge bg-${statusClass} fs-6">${statusText}</span>
                        </div>

                        <div class="submission-description mb-3">
                            <strong>Mô tả:</strong>
                            <p class="mt-1 mb-0">${this.escapeHtml(submission.description)}</p>
                        </div>

                        ${submission.feedback ? `
                            <div class="submission-feedback mb-3">
                                <strong>Phản hồi từ người duyệt:</strong>
                                <p class="mt-1 mb-0 text-muted">${this.escapeHtml(submission.feedback)}</p>
                            </div>
                        ` : ''}

                        <div class="submission-attachments mb-3">
                            <strong>File đính kèm:</strong>
                            <div class="attachments-list mt-2">
                                ${attachmentsHtml}
                            </div>
                        </div>

                        <div class="submission-actions d-flex align-items-center">
                            ${viewDetailBtn}
                            ${submission.status === 'PENDING' ? `
                                <button class="btn btn-success btn-sm ms-2" onclick="taskDetailsManager.approveSubmission(${submission.id})">
                                    <i class="bi bi-check-circle me-1"></i>Duyệt
                                </button>
                                <button class="btn btn-danger btn-sm ms-2" onclick="taskDetailsManager.rejectSubmission(${submission.id})">
                                    <i class="bi bi-x-circle me-1"></i>Từ chối
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div class="submissions-header mb-4">
                <h5><i class="bi bi-file-text me-2"></i>Danh sách nộp bài (${submissions.length})</h5>
                <p class="text-muted">Quản lý và đánh giá các bài nộp của thành viên</p>
            </div>
            <div class="submissions-list">
                ${submissionsHtml}
            </div>
            <style>
                .submission-card {
                    border-left: 4px solid #007bff;
                    transition: all 0.3s ease;
                }
                .submission-card:hover {
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .submission-card .badge.bg-warning {
                    background-color: #ffc107 !important;
                }
                .submission-card .badge.bg-success {
                    background-color: #198754 !important;
                }
                .submission-card .badge.bg-danger {
                    background-color: #dc3545 !important;
                }
                .attachment-item {
                    padding: 0.25rem 0;
                    border-bottom: 1px solid #e9ecef;
                }
                .attachment-item:last-child {
                    border-bottom: none;
                }
                .submissions-header h5 {
                    color: #495057;
                    font-weight: 600;
                }
                .submission-actions .btn {
                    font-size: 0.875rem;
                }
            </style>
        `;

        // Gán sự kiện click cho nút xem chi tiết
        setTimeout(() => {
            document.querySelectorAll('.view-log-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const logId = this.getAttribute('data-log-id');
                    showSubmissionLogModal(logId);
                });
            });
        }, 0);
    }

    async approveSubmission(submissionId) {
        const feedback = prompt('Nhập phản hồi cho bài nộp (tùy chọn):');
        if (feedback === null) return; // User cancelled
        
        try {
            await apiClient.post(`/task-approvals/${submissionId}/approve?note=${encodeURIComponent(feedback.trim())}`);

            showNotification('Đã duyệt bài nộp thành công!', 'success');
            this.loadSubmissions(); // Reload submissions
            
        } catch (error) {
            console.error('❌ Error approving submission:', error);
            showNotification('Lỗi khi duyệt bài nộp: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async rejectSubmission(submissionId) {
        const feedback = prompt('Nhập lý do từ chối (bắt buộc):');
        if (!feedback || feedback.trim() === '') {
            alert('Vui lòng nhập lý do từ chối!');
            return;
        }
        
        try {
            await apiClient.post(`/task-approvals/${submissionId}/reject?note=${encodeURIComponent(feedback.trim())}`);

            showNotification('Đã từ chối bài nộp!', 'warning');
            this.loadSubmissions(); // Reload submissions
            
        } catch (error) {
            console.error('❌ Error rejecting submission:', error);
            showNotification('Lỗi khi từ chối bài nộp: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    // Helper Methods
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

    getPriorityText(priority) {
        const priorityMap = {
            'LOW': 'Thấp',
            'MEDIUM': 'Trung bình',
            'HIGH': 'Cao',
            'CRITICAL': 'Khẩn cấp'
        };
        return priorityMap[priority] || priority;
    }

    getPriorityClass(priority) {
        const priorityMap = {
            'LOW': 'low',
            'MEDIUM': 'medium',
            'HIGH': 'high',
            'CRITICAL': 'critical'
        };
        return priorityMap[priority] || 'medium';
    }

    getInitials(name) {
        if (!name) return '?';
        
        // Handle both full name string and separate first/last name
        let nameParts = [];
        
        if (typeof name === 'string') {
            nameParts = name.split(' ').filter(part => part.length > 0);
        } else if (typeof name === 'object' && name.firstName && name.lastName) {
            // Handle UserDto-like object with firstName/lastName
            nameParts = [name.firstName, name.lastName].filter(part => part && part.length > 0);
        }
        
        if (nameParts.length === 0) return '?';
        
        return nameParts
            .map(part => part.charAt(0).toUpperCase())
            .join('')
            .slice(0, 2);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Files helper methods
    getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'bi-file-pdf',
            'doc': 'bi-file-word',
            'docx': 'bi-file-word',
            'xls': 'bi-file-excel',
            'xlsx': 'bi-file-excel',
            'ppt': 'bi-file-ppt',
            'pptx': 'bi-file-ppt',
            'txt': 'bi-file-text',
            'jpg': 'bi-file-image',
            'jpeg': 'bi-file-image',
            'png': 'bi-file-image',
            'gif': 'bi-file-image',
            'zip': 'bi-file-zip',
            'rar': 'bi-file-zip'
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

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    canManageFiles() {
        if (!this.currentUser || !this.currentTask) return false;
        
        // Task creator can manage files - try multiple ways to get creator ID
        let taskCreatorId = null;
        
        if (this.currentTask.createdById) {
            taskCreatorId = this.currentTask.createdById;
        } else if (this.currentTask.creatorInfo && this.currentTask.creatorInfo.id) {
            taskCreatorId = this.currentTask.creatorInfo.id;
        } else if (this.currentTask.createdBy && typeof this.currentTask.createdBy === 'object') {
            taskCreatorId = this.currentTask.createdBy.id;
        } else if (typeof this.currentTask.createdBy === 'number' || typeof this.currentTask.createdBy === 'string') {
            taskCreatorId = this.currentTask.createdBy;
        }
        
        if (taskCreatorId === this.currentUser.id) return true;
        
        // Project leaders can manage files
        const userRole = this.currentUser.projectRole;
        return userRole === 'LEADER' || userRole === 'VICE_LEADER';
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showError(message) {
        // Simple error display for now
        alert(message);
    }
}

// Global Functions
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
    
    // Load tab content
    if (window.taskDetailsManager) {
        window.taskDetailsManager.loadTabContent(tabName);
    }
}

function editTask() {
    // Navigate to task edit page (to be implemented)
    console.log('Edit task functionality to be implemented');
}

function submitTask() {
    // Show submit task modal or navigate to submit page
    console.log('Submit task functionality to be implemented');
    
    // For now, show a simple modal
    if (confirm('Bạn có chắc chắn muốn nộp nhiệm vụ này?')) {
        // TODO: Implement actual submission logic
        alert('Tính năng nộp nhiệm vụ sẽ được triển khai sau!');
    }
}

function createSubTask() {
    // Lấy projectId và taskId hiện tại
    let projectId = null;
    let parentId = null;
    if (window.taskDetailsManager && window.taskDetailsManager.currentTask) {
        projectId = window.taskDetailsManager.currentTask.projectId;
        parentId = window.taskDetailsManager.currentTask.id;
    }
    if (projectId && parentId) {
        // Chuyển hướng sang trang tạo nhiệm vụ con, truyền projectId và parentId qua URL
        window.location.href = `task-create.html?projectId=${projectId}&parentId=${parentId}`;
    } else {
        showToast('Không xác định được dự án hoặc nhiệm vụ cha!', 'error');
    }
}

function assignMember() {
    // Show assign member modal (to be implemented)
    console.log('Assign member functionality to be implemented');
}

function expandAllTasks() {
    if (window.taskDetailsManager) {
        window.taskDetailsManager.expandAllHierarchyTasks();
    }
}

function collapseAllTasks() {
    if (window.taskDetailsManager) {
        window.taskDetailsManager.collapseAllHierarchyTasks();
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

function markAllAsRead() {
    console.log('Mark all notifications as read functionality to be implemented');
}

// Global Functions for Files
function uploadFile() {
    // Create upload modal
    const modal = document.createElement('div');
    modal.className = 'upload-modal';
    modal.innerHTML = `
        <div class="upload-content">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Tải lên file đính kèm</h5>
                <button type="button" class="btn-close" onclick="closeUploadModal()"></button>
            </div>
            
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">
                    <i class="bi bi-cloud-upload"></i>
                </div>
                <h6>Kéo thả file vào đây hoặc click để chọn</h6>
                <p class="text-muted">Hỗ trợ tất cả định dạng file, tối đa 50MB</p>
                <input type="file" id="fileInput" multiple style="display: none;">
            </div>
            
            <div class="file-list" id="fileList" style="display: none;">
                <h6>File đã chọn:</h6>
                <div id="selectedFiles"></div>
            </div>
            
            <div class="d-flex justify-content-end gap-2 mt-3">
                <button type="button" class="btn btn-secondary" onclick="closeUploadModal()">Hủy</button>
                <button type="button" class="btn btn-primary" onclick="confirmUpload()" id="uploadBtn" disabled>
                    <i class="bi bi-cloud-upload me-2"></i>Tải lên
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup file input events
    setupFileUpload();
}

function closeUploadModal() {
    const modal = document.querySelector('.upload-modal');
    if (modal) {
        modal.remove();
    }
}

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const selectedFiles = document.getElementById('selectedFiles');
    const uploadBtn = document.getElementById('uploadBtn');
    
    let files = [];
    
    // Click to select files
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    function handleFiles(newFiles) {
        files = Array.from(newFiles);
        
        if (files.length > 0) {
            fileList.style.display = 'block';
            uploadBtn.disabled = false;
            
            selectedFiles.innerHTML = files.map(file => `
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                        <i class="bi ${window.taskDetailsManager.getFileIcon(file.name)} me-2"></i>
                        ${file.name}
                    </div>
                    <small class="text-muted">${window.taskDetailsManager.formatFileSize(file.size)}</small>
                </div>
            `).join('');
        }
    }
}

async function confirmUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (!fileInput.files.length) return;
    
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tải lên...';
    
    try {
        const formData = new FormData();
        Array.from(fileInput.files).forEach(file => {
            formData.append('files', file);
        });
        
        await apiClient.upload(`/files/task/${window.taskDetailsManager.taskId}`, formData);
        
        closeUploadModal();
        await window.taskDetailsManager.loadFiles();
        
        // Show success message
        showNotification('Tải lên file thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Error uploading files:', error);
        showNotification('Lỗi khi tải lên file: ' + (error.message || 'Unknown error'), 'error');
        
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Tải lên';
    }
}

async function downloadFile(fileId, fileName) {
    try {
        let headers = {};
        if (typeof authUtils !== 'undefined' && authUtils.getAuthHeader) {
            headers = authUtils.getAuthHeader();
        }
        const res = await fetch(`/api/files/download/${fileId}`, { headers });
        if (!res.ok) throw new Error('Lỗi tải file');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'file';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            a.remove();
        }, 1000);
    } catch (error) {
        console.error('❌ Error downloading file:', error);
        showNotification('Lỗi khi tải xuống file', 'error');
    }
}

function previewFile(fileId, fileName) {
    // Open file preview in new tab
    window.open(`/api/files/${fileId}/preview`, '_blank');
}

async function deleteFile(fileId, fileName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa file "${fileName}"?`)) return;
    
    try {
        await apiClient.delete(`/files/${fileId}`);
        await window.taskDetailsManager.loadFiles();
        showNotification('Xóa file thành công!', 'success');
    } catch (error) {
        console.error('❌ Error deleting file:', error);
        showNotification('Lỗi khi xóa file: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Global Functions for Settings
async function saveTaskBasicInfo() {
    try {
        const taskData = {
            title: document.getElementById('editTaskTitle').value,
            description: document.getElementById('editTaskDescription').value,
            priority: document.getElementById('editTaskPriority').value,
            status: document.getElementById('editTaskStatus').value,
            deadline: document.getElementById('editTaskDeadline').value || null
        };
        
        await apiClient.put(`/tasks/${window.taskDetailsManager.taskId}`, taskData);
        
        // Reload task details
        await window.taskDetailsManager.loadTaskDetails();
        
        showNotification('Cập nhật thông tin nhiệm vụ thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Error saving task:', error);
        showNotification('Lỗi khi cập nhật nhiệm vụ: ' + (error.message || 'Unknown error'), 'error');
    }
}

function resetTaskBasicForm() {
    window.taskDetailsManager.loadSettings();
}

async function deleteTaskConfirm() {
    const taskName = window.taskDetailsManager.currentTask?.title || 'này';
    
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN nhiệm vụ "${taskName}"?\n\nHành động này không thể hoàn tác!`)) return;
    
    // Double confirmation
    const confirmText = prompt('Để xác nhận, hãy nhập "DELETE" (viết hoa):');
    if (confirmText !== 'DELETE') {
        showNotification('Hủy thao tác xóa nhiệm vụ', 'info');
        return;
    }
    
    try {
        await apiClient.delete(`/tasks/${window.taskDetailsManager.taskId}`);
        
        showNotification('Xóa nhiệm vụ thành công!', 'success');
        
        // Redirect to tasks page
        setTimeout(() => {
            window.location.href = 'tasks.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        showNotification('Lỗi khi xóa nhiệm vụ: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function archiveTask() {
    const taskName = window.taskDetailsManager.currentTask?.title || 'này';
    
    if (!confirm(`Bạn có chắc chắn muốn lưu trữ nhiệm vụ "${taskName}"?`)) return;
    
    try {
        await apiClient.post(`/tasks/${window.taskDetailsManager.taskId}/archive`);
        
        await window.taskDetailsManager.loadTaskDetails();
        showNotification('Lưu trữ nhiệm vụ thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Error archiving task:', error);
        showNotification('Lỗi khi lưu trữ nhiệm vụ: ' + (error.message || 'Unknown error'), 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create and show notification (implement based on your notification system)
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Initialize
let taskDetailsManager;
document.addEventListener('DOMContentLoaded', () => {
    taskDetailsManager = new TaskDetailsManager();
    window.taskDetailsManager = taskDetailsManager;
});
