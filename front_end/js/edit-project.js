// edit-project.js
// Load project data and handle update form

document.addEventListener('DOMContentLoaded', async function () {
    // Đảm bảo apiClient đã được load từ utils/api-client.js
    if (typeof apiClient === 'undefined' || !apiClient.getHeaders) {
        alert('Không tìm thấy apiClient! Hãy kiểm tra lại thứ tự <script> trong HTML.');
        throw new Error('apiClient is not loaded!');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id') || urlParams.get('projectId');
    const form = document.getElementById('editProjectForm');
    const alertBox = document.getElementById('editProjectAlert');

    if (!projectId) {
        showAlert('Không tìm thấy ID dự án!', 'danger');
        form.classList.add('d-none');
        return;
    }

    // Load current project data
    try {
        const project = await apiClient.get(`/projects/${projectId}`);
        if (project) {
            document.getElementById('projectName').value = project.name || '';
            document.getElementById('projectDescription').value = project.description || '';
            document.getElementById('projectStatus').value = project.status || 'ACTIVE';
        }
    } catch (error) {
        showAlert('Không thể tải dữ liệu dự án!', 'danger');
        form.classList.add('d-none');
        return;
    }

    // Sau khi load project, set giá trị cho startDate và endDate
    const startDateInput = document.getElementById('projectStartDate');
    const endDateInput = document.getElementById('projectEndDate');
    if (startDateInput && endDateInput && projectId) {
        try {
            const project = await apiClient.get(`/projects/${projectId}`);
            if (project.startDate) {
                startDateInput.value = project.startDate.split('T')[0];
                // Disable nếu ngày bắt đầu đã qua
                if (new Date(project.startDate) < new Date()) {
                    startDateInput.disabled = true;
                }
            }
            if (project.endDate) {
                endDateInput.value = project.endDate.split('T')[0];
            }
        } catch (e) {}
    }

    // Form validation
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopPropagation();
        form.classList.add('was-validated');
        if (!form.checkValidity()) return;

        const data = {
            name: document.getElementById('projectName').value.trim(),
            description: document.getElementById('projectDescription').value.trim(),
            status: document.getElementById('projectStatus').value,
            startDate: startDateInput && !startDateInput.disabled ? startDateInput.value : undefined,
            endDate: endDateInput ? endDateInput.value : undefined
        };
        // Xoá thuộc tính nếu không có giá trị (tránh gửi undefined)
        if (!data.startDate) delete data.startDate;
        if (!data.endDate) delete data.endDate;

        try {
            await apiClient.put(`/projects/${projectId}`, data);
            showAlert('Cập nhật dự án thành công!', 'success');
            setTimeout(() => {
                window.location.href = `project-details.html?id=${projectId}`;
            }, 1200);
        } catch (error) {
            showAlert('Cập nhật dự án thất bại!', 'danger');
        }
    });

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type} mt-4`;
        alertBox.classList.remove('d-none');
    }
});
