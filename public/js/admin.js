// Admin Dashboard JavaScript

let applications = [];
let filteredApplications = [];

// Load applications on page load
document.addEventListener('DOMContentLoaded', () => {
    loadApplications();
    
    // Set up event listeners for filters
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('accountTypeFilter').addEventListener('change', applyFilters);

    // Set up event listener for modal close button
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeDetailsModal);
    }
});

// Load all applications from the server
async function loadApplications() {
    try {
        const response = await fetch('/api/cdsc/applications');
        const data = await response.json();
        
        if (data.success) {
            applications = data.applications;
            filteredApplications = applications;
            updateStatistics();
            renderTable();
        } else {
            showError('Failed to load applications');
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        showError('Error loading applications');
    }
}

// Update statistics cards
function updateStatistics() {
    const total = applications.length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
}

// Apply search and filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const accountTypeFilter = document.getElementById('accountTypeFilter').value;
    
    filteredApplications = applications.filter(app => {
        // Search filter
        const matchesSearch = !searchTerm || 
            app.primary_surname.toLowerCase().includes(searchTerm) ||
            app.primary_other_names.toLowerCase().includes(searchTerm) ||
            app.primary_email.toLowerCase().includes(searchTerm) ||
            app.primary_id_number.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = !statusFilter || app.status === statusFilter;
        
        // Account type filter
        const matchesAccountType = !accountTypeFilter || app.account_type === accountTypeFilter;
        
        return matchesSearch && matchesStatus && matchesAccountType;
    });
    
    renderTable();
}

// Render the applications table
function renderTable() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('applicationsTable');
    const tbody = document.getElementById('applicationsTableBody');
    
    loadingState.style.display = 'none';
    
    if (filteredApplications.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    
    tbody.innerHTML = filteredApplications.map(app => `
        <tr>
            <td>#${app.id}</td>
            <td>${formatDate(app.submission_date)}</td>
            <td>${app.primary_surname}, ${app.primary_other_names}</td>
            <td>${capitalize(app.account_type)}</td>
            <td>${app.primary_email}</td>
            <td>${app.primary_country_code} ${app.primary_phone}</td>
            <td><span class="status-badge status-${app.status}">${capitalize(app.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm view-btn" data-id="${app.id}">View</button>
                    <button class="btn btn-secondary btn-sm pdf-btn" data-id="${app.id}">PDF</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${app.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event delegation for action buttons
    tbody.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            viewDetails(id);
        });
    });
    tbody.querySelectorAll('.pdf-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            downloadPDF(id);
        });
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteApplication(id);
        });
    });
}

// View application details in modal
function viewDetails(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-group full-width">
                <div class="detail-label">Application ID</div>
                <div class="detail-value">#${app.id}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Submission Date</div>
                <div class="detail-value">${formatDate(app.submission_date)}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="status-badge status-${app.status}">${capitalize(app.status)}</span>
                </div>
            </div>
        </div>

        <h3 class="section-title">Account Information</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">Account Type</div>
                <div class="detail-value">${capitalize(app.account_type)}</div>
            </div>
            ${app.cda_code ? `
            <div class="detail-group">
                <div class="detail-label">CDA Code</div>
                <div class="detail-value">${app.cda_code}</div>
            </div>` : ''}
            ${app.cds_account_number ? `
            <div class="detail-group">
                <div class="detail-label">CDS Account Number</div>
                <div class="detail-value">${app.cds_account_number}</div>
            </div>` : ''}
        </div>

        <h3 class="section-title">Primary Client Details</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">Full Name</div>
                <div class="detail-value">${app.primary_surname}, ${app.primary_other_names}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Date of Birth</div>
                <div class="detail-value">${app.primary_dob}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Gender</div>
                <div class="detail-value">${capitalize(app.primary_gender)}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Investor Category</div>
                <div class="detail-value">${app.primary_investor_category}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">ID Type</div>
                <div class="detail-value">${capitalize(app.primary_id_type)}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">ID Number</div>
                <div class="detail-value">${app.primary_id_number}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Nationality</div>
                <div class="detail-value">${app.primary_nationality}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Country of Residence</div>
                <div class="detail-value">${app.primary_country_residence}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">KRA PIN</div>
                <div class="detail-value">${app.primary_kra_pin}</div>
            </div>
        </div>

        <h3 class="section-title">Contact Information</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">Phone</div>
                <div class="detail-value">${app.primary_country_code} ${app.primary_phone}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Email</div>
                <div class="detail-value">${app.primary_email}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Physical Location</div>
                <div class="detail-value">${app.primary_physical_location}</div>
            </div>
            
            ${app.primary_postal_address ? `
            <div class="detail-group">
                <div class="detail-label">Postal Address</div>
                <div class="detail-value">${app.primary_postal_address}${app.primary_postal_code ? ' - ' + app.primary_postal_code : ''}</div>
            </div>` : ''}
        </div>

        <h3 class="section-title">Source of Funds</h3>
        <div class="detail-grid">
            <div class="detail-group full-width">
                <div class="detail-label">Source</div>
                <div class="detail-value">${capitalize(app.primary_fund_source)}</div>
            </div>
            
            ${app.primary_fund_source === 'employment' && app.primary_employer_name ? `
            <div class="detail-group">
                <div class="detail-label">Employer Name</div>
                <div class="detail-value">${app.primary_employer_name}</div>
            </div>
            ${app.primary_employer_phone ? `
            <div class="detail-group">
                <div class="detail-label">Employer Phone</div>
                <div class="detail-value">${app.primary_employer_phone}</div>
            </div>` : ''}` : ''}
            
            ${app.primary_fund_source === 'business' && app.primary_business_name ? `
            <div class="detail-group">
                <div class="detail-label">Business Name</div>
                <div class="detail-value">${app.primary_business_name}</div>
            </div>
            ${app.primary_business_reg_number ? `
            <div class="detail-group">
                <div class="detail-label">Registration Number</div>
                <div class="detail-value">${app.primary_business_reg_number}</div>
            </div>` : ''}` : ''}
        </div>

        ${app.account_type === 'joint' && app.secondary_surname ? `
        <h3 class="section-title">Secondary Client Details</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">Full Name</div>
                <div class="detail-value">${app.secondary_surname}, ${app.secondary_other_names}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Email</div>
                <div class="detail-value">${app.secondary_email}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Phone</div>
                <div class="detail-value">${app.secondary_country_code} ${app.secondary_phone}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">ID Number</div>
                <div class="detail-value">${app.secondary_id_number}</div>
            </div>
        </div>` : ''}

        <h3 class="section-title">Payment Details</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">Payment Method</div>
                <div class="detail-value">${capitalize(app.payment_method)} ${app.payment_method === 'domestic' ? 'Bank' : app.payment_method === 'international' ? 'Bank' : 'Money'}</div>
            </div>
            
            ${app.payment_method !== 'mobile' ? `
            <div class="detail-group">
                <div class="detail-label">Bank Name</div>
                <div class="detail-value">${app.bank_name}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Account Number</div>
                <div class="detail-value">${app.account_number}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Account Name</div>
                <div class="detail-value">${app.account_name}</div>
            </div>

            <div class="detail-group">
                <div class="detail-label">Major Currency</div>
                <div class="detail-value">${app.currency}</div>
            </div>

            ${app.other_currency ? `
            <div class="detail-group">
                <div class="detail-label">Other Currency</div>
                <div class="detail-value">${app.other_currency}</div>
            </div>` : ''}
            
            ${app.branch_code ? `
            <div class="detail-group">
                <div class="detail-label">Branch Code</div>
                <div class="detail-value">${app.branch_code}</div>
            </div>` : ''}
            
            ${app.swift_code ? `
            <div class="detail-group">
                <div class="detail-label">SWIFT Code</div>
                <div class="detail-value">${app.swift_code}</div>
            </div>` : ''}` : `
            <div class="detail-group">
                <div class="detail-label">Mobile Money Number</div>
                <div class="detail-value">${app.mobile_money_phone}</div>
            </div>`}
        </div>

        <h3 class="section-title">Additional Information</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">PEP Status</div>
                <div class="detail-value">${app.is_pep ? 'Yes' : 'No'}</div>
            </div>
            
            ${app.is_pep && app.pep_details ? `
            <div class="detail-group full-width">
                <div class="detail-label">PEP Details</div>
                <div class="detail-value">${app.pep_details}</div>
            </div>` : ''}
            
            <div class="detail-group">
                <div class="detail-label">Tax Exempt</div>
                <div class="detail-value">${app.is_tax_exempt ? 'Yes' : 'No'}</div>
            </div>
        </div>

        <h3 class="section-title">Declaration</h3>
        <div class="detail-grid">
            <div class="detail-group">
                <div class="detail-label">Signing Mandate</div>
                <div class="detail-value">${capitalize(app.signing_mandate)}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Signatories</div>
                <div class="detail-value">${app.signer_names}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Signature Date</div>
                <div class="detail-value">${app.signature_date}</div>
            </div>
        </div>

        <h3 class="section-title">Actions</h3>
        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button class="btn btn-primary" id="approveBtn">Approve</button>
            <button class="btn btn-danger" id="rejectBtn">Reject</button>
            <button class="btn btn-secondary" id="downloadPdfBtn">Download PDF</button>
        </div>
    `;
    
    document.getElementById('detailsModal').classList.add('active');

    // Add event listeners for action buttons in modal
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            updateStatus(app.id, 'approved');
        });
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            updateStatus(app.id, 'rejected');
        });
    }
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function() {
            downloadPDF(app.id);
        });
    }
}

// Close details modal
function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

// Update application status
async function updateStatus(id, status) {
    if (!confirm(`Are you sure you want to ${status} this application?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cdsc/applications/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Application ${status} successfully!`);
            closeDetailsModal();
            loadApplications();
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

// Download filled PDF
async function downloadPDF(id) {
    try {
        window.location.href = `/api/cdsc/applications/${id}/pdf`;
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error downloading PDF');
    }
}

// Delete application
async function deleteApplication(id) {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cdsc/applications/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Application deleted successfully!');
            loadApplications();
        } else {
            alert('Failed to delete application');
        }
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showError(message) {
    const loadingState = document.getElementById('loadingState');
    loadingState.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>${message}</p>
    `;
}

// Close modal when clicking outside
document.getElementById('detailsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailsModal();
    }
});
