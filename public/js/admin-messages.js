// ==========================================
// ADMIN MESSAGES DASHBOARD
// ==========================================

let allMessages = [];
let currentMessageId = null;

// ==========================================
// Initialize on page load
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadMessages();
    setupEventListeners();
});

// ==========================================
// Event Listeners Setup
// ==========================================
function setupEventListeners() {
    // Filter listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('subjectFilter').addEventListener('change', applyFilters);

    // Modal close
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('detailsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('detailsModal')) {
            closeModal();
        }
    });

    // Keyboard shortcut - ESC to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('detailsModal').classList.contains('active')) {
            closeModal();
        }
    });
}

// ==========================================
// Load Messages from API
// ==========================================
async function loadMessages() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('messagesTable');

    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    table.style.display = 'none';

    try {
        const response = await fetch('/api/admin/contact-messages');
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to load messages');

        allMessages = data.messages || [];
        updateStatistics(data.counts || {});
        renderTable(allMessages);

        loadingState.style.display = 'none';

        if (allMessages.length === 0) {
            emptyState.style.display = 'block';
        } else {
            table.style.display = 'table';
        }

    } catch (error) {
        console.error('Error loading messages:', error);
        loadingState.innerHTML = `
            <div class="error-state">
                <p style="color: var(--error-red);">Failed to load messages. Please refresh the page.</p>
            </div>
        `;
    }
}

// ==========================================
// Update Statistics
// ==========================================
function updateStatistics(counts) {
    const total = counts.pending + counts.addressed + counts.ignored;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = counts.pending || 0;
    document.getElementById('addressedCount').textContent = counts.addressed || 0;
    document.getElementById('ignoredCount').textContent = counts.ignored || 0;
}

// ==========================================
// Render Table
// ==========================================
function renderTable(messages) {
    const tbody = document.getElementById('messagesTableBody');
    tbody.innerHTML = '';

    if (messages.length === 0) {
        document.getElementById('messagesTable').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    document.getElementById('messagesTable').style.display = 'table';
    document.getElementById('emptyState').style.display = 'none';

    messages.forEach(message => {
        const row = createTableRow(message);
        tbody.appendChild(row);
    });
}

// ==========================================
// Create Table Row
// ==========================================
function createTableRow(message) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${message.id}</td>
        <td>${formatDate(message.submission_date)}</td>
        <td>${escapeHtml(message.first_name)} ${escapeHtml(message.last_name)}</td>
        <td>${escapeHtml(message.email)}</td>
        <td>${formatSubject(message.subject)}</td>
        <td><div class="message-preview">${escapeHtml(message.message)}</div></td>
        <td><span class="status-badge status-${message.status}">${message.status}</span></td>
        <td>
            <div class="action-buttons">
                <button class="icon-btn btn-view" data-id="${message.id}" data-action="view">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View
                </button>
                <a href="mailto:${escapeHtml(message.email)}" class="icon-btn btn-reply">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Reply
                </a>
                <button class="icon-btn btn-delete" data-id="${message.id}" data-action="delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        </td>
    `;

    // Add event listeners to buttons
    tr.querySelector('[data-action="view"]').addEventListener('click', () => viewMessage(message.id));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => deleteMessage(message.id));

    return tr;
}

// ==========================================
// View Message Details
// ==========================================
async function viewMessage(id) {
    currentMessageId = id;
    const message = allMessages.find(m => m.id === id);
    if (!message) return;

    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-group">
                <span class="detail-label">Message ID</span>
                <span class="detail-value">#${message.id}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Submission Date</span>
                <span class="detail-value">${formatDate(message.submission_date)}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">First Name</span>
                <span class="detail-value">${escapeHtml(message.first_name)}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Last Name</span>
                <span class="detail-value">${escapeHtml(message.last_name)}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Email</span>
                <span class="detail-value">${escapeHtml(message.email)}</span>
            </div>
            <div class="detail-group">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${escapeHtml(message.phone || 'N/A')}</span>
            </div>
            <div class="detail-group full-width">
                <span class="detail-label">Subject</span>
                <span class="detail-value">${formatSubject(message.subject)}</span>
            </div>
            <div class="detail-group full-width">
                <span class="detail-label">Status</span>
                <span class="status-badge status-${message.status}">${message.status}</span>
            </div>
        </div>

        <h3 class="section-title">Message</h3>
        <div class="message-detail-box">
            <p>${escapeHtml(message.message)}</p>
        </div>

        ${message.admin_notes ? `
            <div class="admin-notes-section">
                <h3 class="section-title">Admin Notes</h3>
                <div class="admin-notes-content">
                    <p>${escapeHtml(message.admin_notes)}</p>
                    ${message.responded_by ? `<div class="admin-notes-meta">By ${escapeHtml(message.responded_by)} on ${formatDate(message.response_date)}</div>` : ''}
                </div>
            </div>
        ` : ''}

        <div class="metadata-grid">
            <div class="metadata-item">
                <div class="metadata-label">IP Address</div>
                <div class="metadata-value">${escapeHtml(message.ip_address || 'N/A')}</div>
            </div>
            <div class="metadata-item">
                <div class="metadata-label">User Agent</div>
                <div class="metadata-value">${escapeHtml(message.user_agent || 'N/A')}</div>
            </div>
        </div>
    `;

    // Populate footer with action buttons
    modalFooter.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-modal-action="reply">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;margin-right:4px;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Reply via Email
        </button>
        ${message.status !== 'addressed' ? `
            <button class="btn btn-status-addressed btn-sm" data-modal-action="mark-addressed">
                Mark as Addressed
            </button>
        ` : ''}
        ${message.status !== 'ignored' ? `
            <button class="btn btn-status-ignored btn-sm" data-modal-action="mark-ignored">
                Mark as Ignored
            </button>
        ` : ''}
        <button class="btn btn-danger btn-sm" data-modal-action="delete">
            Delete Message
        </button>
    `;

    // Add event listeners to modal buttons
    const replyBtn = modalFooter.querySelector('[data-modal-action="reply"]');
    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            window.location.href = `mailto:${message.email}`;
        });
    }

    const addressedBtn = modalFooter.querySelector('[data-modal-action="mark-addressed"]');
    if (addressedBtn) {
        addressedBtn.addEventListener('click', () => updateMessageStatus(message.id, 'addressed'));
    }

    const ignoredBtn = modalFooter.querySelector('[data-modal-action="mark-ignored"]');
    if (ignoredBtn) {
        ignoredBtn.addEventListener('click', () => updateMessageStatus(message.id, 'ignored'));
    }

    const deleteBtn = modalFooter.querySelector('[data-modal-action="delete"]');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteMessage(message.id));
    }

    openModal();
}

// ==========================================
// Update Message Status
// ==========================================
async function updateMessageStatus(id, status) {
    if (!confirm(`Are you sure you want to mark this message as ${status}?`)) return;

    try {
        const response = await fetch(`/api/admin/contact-messages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, respondedBy: 'Admin' }) // TODO: get actual admin username
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to update status');

        closeModal();
        loadMessages(); // Reload to update UI
        showToast(`Message marked as ${status}`, 'success');

    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update message status', 'error');
    }
}

// ==========================================
// Delete Message
// ==========================================
async function deleteMessage(id) {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) return;

    try {
        const response = await fetch(`/api/admin/contact-messages/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to delete message');

        closeModal();
        loadMessages(); // Reload to update UI
        showToast('Message deleted successfully', 'success');

    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Failed to delete message', 'error');
    }
}

// ==========================================
// Apply Filters
// ==========================================
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const subjectFilter = document.getElementById('subjectFilter').value;

    const filtered = allMessages.filter(message => {
        const matchesSearch = 
            message.first_name.toLowerCase().includes(searchTerm) ||
            message.last_name.toLowerCase().includes(searchTerm) ||
            message.email.toLowerCase().includes(searchTerm) ||
            message.subject.toLowerCase().includes(searchTerm) ||
            message.message.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusFilter || message.status === statusFilter;
        const matchesSubject = !subjectFilter || message.subject === subjectFilter;

        return matchesSearch && matchesStatus && matchesSubject;
    });

    renderTable(filtered);
}

// ==========================================
// Modal Control
// ==========================================
function openModal() {
    document.getElementById('detailsModal').classList.add('active');
}

function closeModal() {
    document.getElementById('detailsModal').classList.remove('active');
    currentMessageId = null;
}

// ==========================================
// Utility Functions
// ==========================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatSubject(subject) {
    const subjectMap = {
        general: 'General Inquiry',
        cdsc: 'CDSC Account Opening',
        equity: 'Equity Trading',
        bonds: 'Bond Investments',
        research: 'Research Reports',
        support: 'Technical Support',
        other: 'Other'
    };
    return subjectMap[subject] || subject;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${type === 'success' ? 'var(--success-green)' : 'var(--error-red)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}