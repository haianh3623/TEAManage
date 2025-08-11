// add-members-modal.js
// Logic for reusable add members modal (suggestion, multi-select, submit)

class AddMembersModal {
    constructor({modalId, inputId, dropdownId, selectedListId, submitBtnId, projectId, onSuccess, existingMemberEmails = []}) {
        this.modal = document.getElementById(modalId);
        this.input = document.getElementById(inputId);
        this.dropdown = document.getElementById(dropdownId);
        this.selectedList = document.getElementById(selectedListId);
        this.submitBtn = document.getElementById(submitBtnId);
        this.projectId = projectId;
        this.onSuccess = onSuccess;
        this.allUsers = [];
        this.suggestions = [];
        this.selectedUsers = [];
        this.existingMemberEmails = existingMemberEmails.map(e => e.toLowerCase());
        this.init();
    }

    setExistingMemberEmails(emails) {
        this.existingMemberEmails = emails.map(e => e.toLowerCase());
    }

    async init() {
        // Fetch all users once for suggestion
        try {
            this.allUsers = await apiClient.get('/users');
        } catch (e) {
            this.allUsers = [];
        }
        this.input.addEventListener('input', this.handleInput.bind(this));
        this.input.addEventListener('focus', this.handleInput.bind(this));
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target) && e.target !== this.input) {
                this.dropdown.style.display = 'none';
            }
        });
        this.dropdown.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent input blur
        });
        this.submitBtn.addEventListener('click', this.handleSubmit.bind(this));
    }

    handleInput() {
        const value = this.input.value.trim().toLowerCase();
        if (!value) {
            this.dropdown.style.display = 'none';
            return;
        }
        this.suggestions = this.allUsers.filter(u =>
            u.email && u.email.toLowerCase().includes(value) &&
            !this.selectedUsers.some(su => su.id === u.id) &&
            !this.existingMemberEmails.includes(u.email.toLowerCase())
        );
        this.renderDropdown();
    }

    renderDropdown() {
        if (this.suggestions.length === 0) {
            this.dropdown.style.display = 'none';
            return;
        }
        this.dropdown.innerHTML = this.suggestions.map(u => {
            const initials = ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase();
            const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim();
            return `<div class="dropdown-item add-member-suggestion d-flex align-items-center gap-2" data-user-id="${u.id}">
                <span class="avatar-circle">${initials || '?'}</span>
                <span class="user-info">
                  <span class="user-fullname">${fullName || 'Không rõ tên'}</span><br>
                  <span class="user-email text-muted small">${u.email || ''}</span>
                </span>
            </div>`;
        }).join('');
        this.dropdown.style.display = 'block';
        this.dropdown.querySelectorAll('.add-member-suggestion').forEach(item => {
            item.addEventListener('click', () => {
                const user = this.suggestions.find(u => u.id == item.dataset.userId);
                if (user) {
                    this.selectedUsers.push(user);
                    this.input.value = '';
                    this.dropdown.style.display = 'none';
                    this.renderSelected();
                }
            });
        });
    }

    renderSelected() {
        this.selectedList.innerHTML = this.selectedUsers.map(u =>
            `<span class="selected-member-chip">
                ${u.firstName || ''} ${u.lastName || ''} &lt;${u.email}&gt;
                <button type="button" class="remove-chip-btn" data-user-id="${u.id}">&times;</button>
            </span>`
        ).join('');
        this.selectedList.querySelectorAll('.remove-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedUsers = this.selectedUsers.filter(u => u.id != btn.dataset.userId);
                this.renderSelected();
            });
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.selectedUsers.length === 0) return;
        this.submitBtn.disabled = true;
        for (const user of this.selectedUsers) {
            try {
                await apiClient.patch(`/projects/${this.projectId}/add-member?userId=${user.id}`);
            } catch (err) {
                // Optionally show error for each user
            }
        }
        this.submitBtn.disabled = false;
        if (typeof this.onSuccess === 'function') this.onSuccess();
        this.selectedUsers = [];
        this.renderSelected();
        if (this.modal) bootstrap.Modal.getInstance(this.modal).hide();
    }
}

// To use:
// new AddMembersModal({modalId: ..., inputId: ..., dropdownId: ..., selectedListId: ..., submitBtnId: ..., projectId: ..., onSuccess: ...});
