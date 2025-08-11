// create-task.js
// Logic tạo nhiệm vụ mới, xử lý UI, fetch, validate, submit

let selectedProject = null;
let projectList = [];
let projectMembers = [];
let projectTasks = [];
let userRole = null;
let assignedUsers = [];

// Helper
function showAlert(msg, type = 'danger') {
    const alertBox = document.getElementById('formAlert');
    alertBox.textContent = msg;
    alertBox.className = `alert alert-${type} mt-3`;
    alertBox.classList.remove('d-none');
}
function hideAlert() {
    document.getElementById('formAlert').classList.add('d-none');
}

// Fetch danh sách dự án
async function fetchProjects() {
    try {
        const res = await apiClient.get('/projects?page=0&size=20');
        projectList = res.content || res || [];
        renderProjectDropdown(projectList);
    } catch {
        showAlert('Không thể tải danh sách dự án!');
    }
}

function renderProjectDropdown(list) {
    const dropdown = document.getElementById('projectDropdown');
    dropdown.innerHTML = list.map(p => `<div class="dropdown-item" data-id="${p.id}">${p.name}</div>`).join('');
    dropdown.classList.toggle('d-none', list.length === 0);
}

// Tìm kiếm dự án
function filterProjects(keyword) {
    keyword = keyword.trim().toLowerCase();
    if (!keyword) return projectList;
    return projectList.filter(p => p.name.toLowerCase().includes(keyword));
}

document.getElementById('projectSearchInput').addEventListener('input', function() {
    const val = this.value;
    renderProjectDropdown(filterProjects(val));
});

document.getElementById('projectSearchInput').addEventListener('focus', function() {
    renderProjectDropdown(filterProjects(this.value));
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.searchable-select')) {
        document.getElementById('projectDropdown').classList.add('d-none');
        document.getElementById('assignedUsersDropdown').classList.add('d-none');
    }
});

document.getElementById('projectDropdown').addEventListener('click', async function(e) {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    const projectId = item.getAttribute('data-id');
    // Fetch lại thông tin dự án đầy đủ
    try {
        const project = await apiClient.get(`/projects/${projectId}`);
        selectedProject = project;
        document.getElementById('projectSearchInput').value = selectedProject.name;
        this.classList.add('d-none');
        await onProjectSelected(projectId);
    } catch (err) {
        showAlert('Không thể tải thông tin dự án!');
    }
});

async function onProjectSelected(projectId) {
    // Fetch chi tiết dự án
    try {
        const project = await apiClient.get(`/projects/${projectId}`);
        projectMembers = (project.members || project.projectMembers || []);
        projectTasks = (project.tasks || project.taskList || []);
        userRole = null;
        // Xác định role
        const user = await apiClient.get('/users/profile');
        const member = projectMembers.find(m => m.email === user.email || m.userId === user.id);
        userRole = member ? member.role : null;
        // Enable/disable fields
        document.getElementById('parentTaskSelect').disabled = false;
        renderParentTaskOptions();
        if (userRole === 'LEADER' || userRole === 'VICE_LEADER') {
            document.getElementById('assignedUsersInput').disabled = false;
        } else {
            document.getElementById('assignedUsersInput').disabled = true;
            assignedUsers = [];
            renderAssignedUsersChips();
        }
        renderAssignedUsersDropdown(projectMembers);
    } catch {
        showAlert('Không thể tải thông tin dự án!');
    }
}

function renderParentTaskOptions() {
    const select = document.getElementById('parentTaskSelect');
    select.innerHTML = '<option value="">-- Không chọn --</option>' +
        projectTasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
}

// Assigned Users Multi-select
function renderAssignedUsersDropdown(members) {
    const dropdown = document.getElementById('assignedUsersDropdown');
    dropdown.innerHTML = members.map(m => `<div class="dropdown-item" data-id="${m.id}">${m.firstName || ''} ${m.lastName || ''} (${m.email})</div>`).join('');
}

document.getElementById('assignedUsersInput').addEventListener('input', function() {
    const val = this.value.trim().toLowerCase();
    const filtered = projectMembers.filter(m => {
        const name = ((m.firstName || '') + ' ' + (m.lastName || '')).toLowerCase();
        return name.includes(val) || (m.email || '').toLowerCase().includes(val);
    });
    renderAssignedUsersDropdown(filtered);
    document.getElementById('assignedUsersDropdown').classList.toggle('d-none', filtered.length === 0);
});

document.getElementById('assignedUsersInput').addEventListener('focus', function() {
    renderAssignedUsersDropdown(projectMembers);
    document.getElementById('assignedUsersDropdown').classList.remove('d-none');
});

document.getElementById('assignedUsersDropdown').addEventListener('click', function(e) {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    const userId = item.getAttribute('data-id');
    const user = projectMembers.find(m => String(m.id) === String(userId));
    if (user && !assignedUsers.some(u => u.id === user.id)) {
        assignedUsers.push(user);
        renderAssignedUsersChips();
    }
    document.getElementById('assignedUsersInput').value = '';
    this.classList.add('d-none');
});

function renderAssignedUsersChips() {
    const chips = assignedUsers.map(u => `<span class="chip">${u.firstName || ''} ${u.lastName || ''} <span class="remove-chip" data-id="${u.id}">&times;</span></span>`).join('');
    document.getElementById('assignedUsersChips').innerHTML = chips;
}

document.getElementById('assignedUsersChips').addEventListener('click', function(e) {
    const rm = e.target.closest('.remove-chip');
    if (!rm) return;
    const userId = rm.getAttribute('data-id');
    assignedUsers = assignedUsers.filter(u => String(u.id) !== String(userId));
    renderAssignedUsersChips();
});

// Submit

document.getElementById('createTaskForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlert();
    if (!selectedProject) {
        showAlert('Vui lòng chọn dự án!');
        return;
    }
    const title = document.getElementById('titleInput').value.trim();
    const description = document.getElementById('descriptionInput').value.trim();
    const priority = parseInt(document.getElementById('priorityInput').value);
    const deadlineDate = document.getElementById('deadlineDateInput').value;
    const deadlineTime = document.getElementById('deadlineTimeInput').value;
    const parentId = document.getElementById('parentTaskSelect').value || null;
    let assigned = (userRole === 'LEADER' || userRole === 'VICE_LEADER') ? assignedUsers : [];
    // Validate
    if (!title) { showAlert('Tiêu đề không được để trống!'); return; }
    if (!priority || priority < 1 || priority > 5) { showAlert('Độ ưu tiên không hợp lệ!'); return; }
    if (!deadlineDate || !deadlineTime) { showAlert('Vui lòng chọn đầy đủ hạn hoàn thành!'); return; }
    // Build deadline ISO string
    const deadline = deadlineDate + 'T' + deadlineTime + ':00';
    // Build request body
    const reqBody = {
        title,
        description,
        priority,
        deadline,
        parentId: parentId ? Number(parentId) : null,
        assignedUsers: assigned.map(u => ({ id: u.id })),
    };
    try {
        const res = await apiClient.post(`/tasks/create/${selectedProject.id}`, reqBody);

        console.log('✅ Task created successfully:', res);
        // await new Promise(resolve => setTimeout(resolve, 80000));

        if (res && res.id) {
            // Nếu có file, upload tiếp
            const fileInput = document.getElementById('taskFileInput');
            console.log('🔄 Uploading files for task:', res.id);
            console.log(fileInput.files.length);

            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                const formData = new FormData();
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
                formData.append('taskId', res.id);
                // Get auth headers
                const headers = {};
                if (typeof authUtils !== 'undefined' && authUtils.isAuthenticated()) {
                    Object.assign(headers, authUtils.getAuthHeader());
                }
                // Gửi file lên endpoint upload
                const response = await fetch('http://localhost:8080/api/files/upload', {
                    method: 'POST',
                    body: formData,
                    headers: headers
                });

                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            window.location.href = `task-details.html?id=${res.id}`;
        } else {
            showAlert('Tạo nhiệm vụ thất bại!');
        }
    } catch (err) {
        showAlert('Tạo nhiệm vụ thất bại! ' + (err?.message || ''));
    }
});

// Init
window.addEventListener('DOMContentLoaded', async function() {
    await fetchProjects();
    // Lấy projectId và parentId từ URL nếu có
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    const parentId = urlParams.get('parentId');
    if (projectId) {
        // Tìm và chọn dự án tương ứng
        selectedProject = projectList.find(p => String(p.id) === String(projectId));
        if (selectedProject) {
            document.getElementById('projectSearchInput').value = selectedProject.name;
            await onProjectSelected(projectId);
            // Nếu có parentId, chọn luôn nhiệm vụ lớn
            if (parentId) {
                document.getElementById('parentTaskSelect').value = parentId;
            }
        }
    }
});
