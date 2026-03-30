// Admin Dashboard JavaScript

let applications = [];
let filteredApplications = [];

document.addEventListener('DOMContentLoaded', () => {
    loadApplications();
    
    // Filters event listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('accountTypeFilter').addEventListener('change', applyFilters);

    // Close modal button
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeDetailsModal);
    }
});

// Load all applications from the server
async function loadApplications() {
    try {
        const [indivRes, corpRes] = await Promise.all([
            fetch('/api/cdsc/applications'),
            fetch('/api/cdsc/corporate/applications')
        ]);
        const indivData = await indivRes.json();
        const corpData  = await corpRes.json();

        const individual = (indivData.success ? indivData.applications : [])
            .map(a => ({ ...a, _type: 'individual' }));
        const corporate  = (corpData.success  ? corpData.applications  : [])
            .map(a => ({ ...a, _type: 'corporate' }));

        applications = [...individual, ...corporate]
            .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));

        filteredApplications = applications;
        updateStatistics();
        renderTable();
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

// Search and filters
function applyFilters() {
    const searchTerm        = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter      = document.getElementById('statusFilter').value;
    const accountTypeFilter = document.getElementById('accountTypeFilter').value;

    filteredApplications = applications.filter(app => {
        // Search — cover both individual (primary_surname) and corporate (registered_name) fields
        const nameStr  = app._type === 'corporate'
            ? (app.registered_name || '')
            : `${app.primary_surname || ''} ${app.primary_other_names || ''}`;
        const emailStr = app._type === 'corporate'
            ? (app.email || '')
            : (app.primary_email || '');
        const idStr    = app._type === 'corporate'
            ? (app.registration_number || '')
            : (app.primary_id_number || '');

        const matchesSearch = !searchTerm ||
            nameStr.toLowerCase().includes(searchTerm) ||
            emailStr.toLowerCase().includes(searchTerm) ||
            idStr.toLowerCase().includes(searchTerm) ||
            (app.gmc_id || '').toLowerCase().includes(searchTerm);

        const matchesStatus = !statusFilter || app.status === statusFilter;

        // Account type filter: 'corporate' matches corporate apps,
        // 'individual' matches both individual and joint (same form)
        const matchesAccountType = !accountTypeFilter ||
            (accountTypeFilter === 'corporate'  && app._type === 'corporate') ||
            (accountTypeFilter === 'individual' && app._type === 'individual');

        return matchesSearch && matchesStatus && matchesAccountType;
    });

    renderTable();
}

// Render applications table
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
    
    tbody.innerHTML = filteredApplications.map(app => {
    const isCorp = app._type === 'corporate';
    const name   = isCorp
        ? (app.registered_name || '—')
        : `${app.primary_surname}, ${app.primary_other_names}`;
    const email  = isCorp ? (app.email || '—') : app.primary_email;
    const phone  = isCorp
        ? `${app.country_code || ''} ${app.phone || ''}`.trim()
        : `${app.primary_country_code} ${app.primary_phone}`;
    const accountTypeLabel = isCorp ? 'Corporate' : 'Personal';
    const applicantTypeLabel = isCorp ? '—' : capitalize(app.account_type); // individual / joint

    return `
        <tr>
            <td>${app.gmc_id || '#' + app.id}</td>
            <td>${formatDate(app.submission_date)}</td>
            <td>${name}</td>
            <td>${accountTypeLabel}</td>
            <td>${applicantTypeLabel}</td>
            <td>${email}</td>
            <td>${phone}</td>
            <td><span class="status-badge status-${app.status}">${capitalize(app.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm view-btn" data-id="${app.id}" data-type="${app._type}">View</button>
                    <button class="btn btn-secondary btn-sm pdf-btn" data-id="${app.id}" data-type="${app._type}">PDF</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${app.id}" data-type="${app._type}">Delete</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    // Event delegation for action buttons
    tbody.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            viewDetails(parseInt(this.getAttribute('data-id')), this.getAttribute('data-type'));
        });
    });
    tbody.querySelectorAll('.pdf-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            downloadPDF(parseInt(this.getAttribute('data-id')), this.getAttribute('data-type'));
        });
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteApplication(parseInt(this.getAttribute('data-id')), this.getAttribute('data-type'));
        });
    });
}

// View application details in modal
function viewDetails(id, type) {
    const app = applications.find(a => a.id === id && a._type === type);
    if (!app) return;
    const isCorp = type === 'corporate';
    const modalBody = document.getElementById('modalBody');

    if (isCorp) {
        modalBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-group full-width">
                    <div class="detail-label">Application ID</div>
                    <div class="detail-value">${app.gmc_id || '#' + app.id}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Submission Date</div>
                    <div class="detail-value">${formatDate(app.submission_date)}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Status</div>
                    <div class="detail-value"><span class="status-badge status-${app.status}">${capitalize(app.status)}</span></div>
                </div>
            </div>

            <h3 class="section-title">Company Details</h3>
            <div class="detail-grid">
                <div class="detail-group"><div class="detail-label">Registered Name</div><div class="detail-value">${app.registered_name}</div></div>
                <div class="detail-group"><div class="detail-label">Registration Number</div><div class="detail-value">${app.registration_number}</div></div>
                <div class="detail-group"><div class="detail-label">Date of Registration</div><div class="detail-value">${app.date_of_registration}</div></div>
                <div class="detail-group"><div class="detail-label">Investor Category</div><div class="detail-value">${app.investor_category}</div></div>
                <div class="detail-group"><div class="detail-label">Country of Registration</div><div class="detail-value">${app.country_of_registration}</div></div>
                <div class="detail-group"><div class="detail-label">KRA PIN</div><div class="detail-value">${app.kra_pin}</div></div>
                <div class="detail-group"><div class="detail-label">Phone</div><div class="detail-value">${app.country_code} ${app.phone}</div></div>
                <div class="detail-group"><div class="detail-label">Email</div><div class="detail-value">${app.email}</div></div>
                <div class="detail-group full-width"><div class="detail-label">Physical Location</div><div class="detail-value">${app.physical_plot}, ${app.physical_road}, ${app.town_city}</div></div>
                ${app.postal_address ? `<div class="detail-group"><div class="detail-label">Postal Address</div><div class="detail-value">${app.postal_address}</div></div>` : ''}
                <div class="detail-group"><div class="detail-label">Source of Funds</div><div class="detail-value">${app.fund_source}</div></div>
            </div>

            <h3 class="section-title">Primary Signatory</h3>
            <div class="detail-grid">
                <div class="detail-group"><div class="detail-label">Name</div><div class="detail-value">${app.sig1_other_names} ${app.sig1_surname}</div></div>
                <div class="detail-group"><div class="detail-label">Designation</div><div class="detail-value">${app.sig1_designation}</div></div>
                <div class="detail-group"><div class="detail-label">ID Number</div><div class="detail-value">${app.sig1_id_number}</div></div>
                <div class="detail-group"><div class="detail-label">KRA PIN</div><div class="detail-value">${app.sig1_kra_pin}</div></div>
                <div class="detail-group"><div class="detail-label">Phone</div><div class="detail-value">${app.sig1_country_code} ${app.sig1_phone}</div></div>
                <div class="detail-group"><div class="detail-label">Email</div><div class="detail-value">${app.sig1_email}</div></div>
            </div>

            ${app.sig2_surname ? `
            <h3 class="section-title">Secondary Signatory</h3>
            <div class="detail-grid">
                <div class="detail-group"><div class="detail-label">Name</div><div class="detail-value">${app.sig2_other_names} ${app.sig2_surname}</div></div>
                <div class="detail-group"><div class="detail-label">Designation</div><div class="detail-value">${app.sig2_designation}</div></div>
                <div class="detail-group"><div class="detail-label">ID Number</div><div class="detail-value">${app.sig2_id_number}</div></div>
                <div class="detail-group"><div class="detail-label">KRA PIN</div><div class="detail-value">${app.sig2_kra_pin}</div></div>
                <div class="detail-group"><div class="detail-label">Phone</div><div class="detail-value">${app.sig2_country_code} ${app.sig2_phone}</div></div>
                <div class="detail-group"><div class="detail-label">Email</div><div class="detail-value">${app.sig2_email}</div></div>
            </div>` : ''}

            <h3 class="section-title">Payment Details</h3>
            <div class="detail-grid">
                <div class="detail-group"><div class="detail-label">Payment Method</div><div class="detail-value">${capitalize(app.payment_method)} Bank</div></div>
                <div class="detail-group"><div class="detail-label">Bank Name</div><div class="detail-value">${app.bank_name}</div></div>
                <div class="detail-group"><div class="detail-label">Account Number</div><div class="detail-value">${app.account_number}</div></div>
                <div class="detail-group"><div class="detail-label">Account Name</div><div class="detail-value">${app.account_name}</div></div>
                ${app.branch_code ? `<div class="detail-group"><div class="detail-label">Branch Code</div><div class="detail-value">${app.branch_code}</div></div>` : ''}
                ${app.swift_code  ? `<div class="detail-group"><div class="detail-label">SWIFT Code</div><div class="detail-value">${app.swift_code}</div></div>`  : ''}
                <div class="detail-group"><div class="detail-label">Tax Exempt</div><div class="detail-value">${app.is_tax_exempt === 'Yes' ? 'Yes' : 'No'}</div></div>
            </div>

            <h3 class="section-title">Declaration</h3>
            <div class="detail-grid">
                <div class="detail-group"><div class="detail-label">PEP Status</div><div class="detail-value">${app.is_pep === 'Yes' ? 'Yes' : 'No'}</div></div>
                <div class="detail-group"><div class="detail-label">Signing Mandate</div><div class="detail-value">${capitalize(app.signing_mandate)}</div></div>
                <div class="detail-group"><div class="detail-label">Signatories</div><div class="detail-value">${app.signer_names}</div></div>
            </div>

            <h3 class="section-title">Actions</h3>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button class="btn btn-primary" id="approveBtn">Approve</button>
                <button class="btn btn-danger" id="rejectBtn">Reject</button>
                <button class="btn btn-secondary" id="downloadPdfBtn">Download PDF</button>
            </div>
        `;

    } else {

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
                <div class="detail-label">Primary Client</div>
                <div class="detail-value">${capitalize(app.primary_fund_source)}</div>
            </div>
            
            ${app.primary_fund_source === 'Employment' && app.primary_employer_name ? `
            <div class="detail-group">
                <div class="detail-label">Employer Name</div>
                <div class="detail-value">${app.primary_employer_name}</div>
            </div>
            ${app.primary_employer_phone ? `
            <div class="detail-group">
                <div class="detail-label">Employer Phone</div>
                <div class="detail-value">${app.primary_employer_phone}</div>
            </div>` : ''}` : ''}
            
            ${app.primary_fund_source === 'Business' && app.primary_business_name ? `
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
        </div>
        <h3 class="section-title">Source of Funds</h3>
        <div class="detail-grid">
            <div class="detail-group full-width">
                <div class="detail-label">Primary Client</div>
                <div class="detail-value">${capitalize(app.secondary_fund_source)}</div>
            </div>
            
            ${app.secondary_fund_source === 'Employment' && app.secondary_employer_name ? `
            <div class="detail-group">
                <div class="detail-label">Employer Name</div>
                <div class="detail-value">${app.secondary_employer_name}</div>
            </div>
            ${app.secondary_employer_phone ? `
            <div class="detail-group">
                <div class="detail-label">Employer Phone</div>
                <div class="detail-value">${app.secondary_employer_phone}</div>
            </div>` : ''}` : ''}
            
            ${app.secondary_fund_source === 'Business' && app.secondary_business_name ? `
            <div class="detail-group">
                <div class="detail-label">Business Name</div>
                <div class="detail-value">${app.secondary_business_name}</div>
            </div>
            ${app.secondary_business_reg_number ? `
            <div class="detail-group">
                <div class="detail-label">Registration Number</div>
                <div class="detail-value">${app.secondary_business_reg_number}</div>
            </div>` : ''}` : ''}
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
                <div class="detail-value">${(app.is_pep === 'Yes' || app.is_pep === true) ? 'Yes' : 'No'}</div>
            </div>
            
            ${(app.is_pep === 'Yes' || app.is_pep === true) && app.pep_details ? `
            <div class="detail-group full-width">
                <div class="detail-label">PEP Details</div>
                <div class="detail-value">${app.pep_details}</div>
            </div>` : ''}
            
            <div class="detail-group">
                <div class="detail-label">Tax Exempt</div>
                <div class="detail-value">${(app.is_tax_exempt === 'Yes' || app.is_tax_exempt === true) ? 'Yes' : 'No'}</div>
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
    `;}
    
    document.getElementById('detailsModal').classList.add('active');

    // Event listeners for action buttons in modal
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            updateStatus(app.id, 'approved', type);
        });
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            updateStatus(app.id, 'rejected', type);
        });
    }
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function() {
            downloadPDF(app.id, type);
        });
    }
}



// Close details modal
function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('active');
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDetailsModal();
    }
});

// Close modal when clicking outside
document.getElementById('detailsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailsModal();
    }
});



// Update application status
async function updateStatus(id, status, type) {
    if (!confirm(`Are you sure you want to ${status} this application?`)) return;
    const base = type === 'corporate' ? '/api/cdsc/corporate/applications' : '/api/cdsc/applications';
    try {
        const response = await fetch(`${base}/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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
async function downloadPDF(id, type) {
    const base = type === 'corporate' ? '/api/cdsc/corporate/applications' : '/api/cdsc/applications';
    try {
        const response = await fetch(`${base}/${id}/pdf`);
        const data = await response.json();
        if (data.success) {
            showDownloadDialog(id, type, data);
        } else {
            alert('Error preparing download');
        }
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error downloading PDF');
    }
}

// Show download options 
function showDownloadDialog(id, type, data) {
    const base = type === 'corporate' ? '/api/cdsc/corporate/applications' : '/api/cdsc/applications';
    let existing = document.getElementById('downloadDialog');
    if (existing) existing.remove();

    // Build KRA cert sub-list from whichever fields came back true
    const kraLabels = type === 'corporate'
        ? { company: 'Company', sig1: 'Signatory 1', sig2: 'Signatory 2' }
        : { primary: 'Primary Applicant', secondary: 'Secondary Applicant' };

    const kraItems = Object.entries(data.kraCerts || {})
        .filter(([, available]) => available)
        .map(([key]) => `
            <button class="btn btn-secondary kra-cert-btn"
                    style="margin-left:1rem;font-size:0.9em;"
                    data-which="${key}">
                ${kraLabels[key]}
            </button>`)
        .join('');

    const kraSection = kraItems
        ? `<div>
               <div style="font-weight:500;margin-top:0.5rem;margin-bottom:0.5rem;">KRA PIN Certificates</div>
               <div style="display:flex;flex-direction:column;gap:0.5rem;">${kraItems}</div>
           </div>`
        : `<button class="btn btn-secondary" disabled>KRA Certificates (none uploaded)</button>`;

    const taxBtnHtml = data.hasTaxCert
        ? `<button id="downloadTaxCertBtn" class="btn btn-secondary">Download Tax Exemption Certificate</button>`
        : '';

    const dialog = document.createElement('div');
    dialog.id = 'downloadDialog';
    dialog.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';
    dialog.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);min-width:340px;max-width:90vw;">
            <h3 style="margin-top:0;">Download Documents</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;margin:1.5rem 0;">
                <button id="downloadMainPdfBtn" class="btn btn-primary">Download Application Form (PDF)</button>
                ${kraSection}
                ${taxBtnHtml}
            </div>
            <button id="closeDownloadDialogBtn" class="btn btn-light" style="margin:0.5rem auto;display:block;">Close</button>
        </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('downloadMainPdfBtn').addEventListener('click', () => window.open(`${base}/${id}/pdf?forceDownload=1`, '_blank'));
    document.getElementById('downloadTaxCertBtn')?.addEventListener('click', () => window.open(`${base}/${id}/tax-certificate`, '_blank'));
    document.getElementById('closeDownloadDialogBtn').addEventListener('click', () => dialog.remove());

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dialog.remove();
        }
    });

    dialog.querySelectorAll('.kra-cert-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            window.open(`${base}/${id}/kra-certificate?which=${this.dataset.which}`, '_blank');
        });
    });

    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.remove(); });
}

// Delete application
async function deleteApplication(id, type) {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) return;
    const base = type === 'corporate' ? '/api/cdsc/corporate/applications' : '/api/cdsc/applications';
    try {
        const response = await fetch(`${base}/${id}`, { method: 'DELETE' });
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
