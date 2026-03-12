// Admin Side News Management

let allNews = [];
let categories = [];
let editingNewsId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    loadCategories();
    initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
    document.getElementById('addNewsBtn').addEventListener('click', openAddModal);
    
    // Modal controls
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Form submission
    document.getElementById('newsForm').addEventListener('submit', handleFormSubmit);
    
    // Filters
    document.getElementById('searchInput').addEventListener('input', filterNews);
    document.getElementById('statusFilter').addEventListener('change', filterNews);
    document.getElementById('categoryFilter').addEventListener('change', filterNews);
    


    // Close modal on outside click
    document.getElementById('newsModal').addEventListener('click', (e) => {
        if (e.target.id === 'newsModal') {
            closeModal();
        }
    });
}

// ==========================================
// LOAD NEWS DATA
// ==========================================
async function loadNews() {
    try {
        const response = await fetch('/api/admin/news');
        const data = await response.json();
        
        allNews = data.news;
        
        // Update stats
        document.getElementById('totalCount').textContent = data.counts.total;
        document.getElementById('publishedCount').textContent = data.counts.published;
        document.getElementById('draftCount').textContent = data.counts.draft;
        
        renderNewsTable(allNews);
    } catch (error) {
        console.error('Error loading news:', error);
        showError('Failed to load news items');
    }
}

// ==========================================
// LOAD CATEGORIES
// ==========================================
async function loadCategories() {
    try {
        const response = await fetch('/api/admin/news/categories');
        categories = await response.json();
        
        // Populate filter dropdown
        const categoryFilter = document.getElementById('categoryFilter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
        
        // Populate datalist for form
        const categoryList = document.getElementById('categoryList');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            categoryList.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ==========================================
// RENDER NEWS TABLE
// ==========================================
function renderNewsTable(newsItems) {
    const tbody = document.getElementById('newsTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const newsTable = document.getElementById('newsTable');

    // Always hide spinner after data is loaded
    if (loadingState) loadingState.style.display = 'none';

    if (newsItems.length === 0) {
        // Show empty state, hide table
        if (emptyState) emptyState.style.display = 'block';
        if (newsTable) newsTable.style.display = 'none';
        tbody.innerHTML = '';
        return;
    } else {
        // Show table, hide empty state
        if (emptyState) emptyState.style.display = 'none';
        if (newsTable) newsTable.style.display = 'table';
    }

    tbody.innerHTML = newsItems.map(news => `
        <tr>
            <td>
                <input type="number" 
                       class="order-input" 
                       value="${news.display_order}"
                       data-id="${news.id}"
                       min="0">
            </td>
            <td>
                <div class="news-preview">
                    ${news.image_filename ? `
                        <img src="../images/news/${news.image_filename}" 
                             alt="${news.title}" 
                             class="news-preview-image">
                    ` : ''}
            </td>
            <td>
                    <div class="news-preview-content">
                        <p class="news-title-preview">${escapeHtml(news.title)}</p>
                        <p class="news-excerpt-preview">${escapeHtml(news.excerpt)}</p>
                    </div>
                </div>
            </td>
            <td>
                <span class="category-pill">${escapeHtml(news.category)}</span>
            </td>
            <td>
                <span class="news-date">${formatDate(news.date)}</span>
            </td>
            <td>
                <span class="status-badge ${news.status}">${news.status}</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon edit" data-action="edit" data-id="${news.id}" title="Edit" style="margin-left: 20px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete" data-action="delete" data-id="${news.id}" title="Delete" style="margin-left: 20px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners for edit/delete buttons and order inputs
    tbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            editNews(Number(id));
        });
    });
    tbody.querySelectorAll('.btn-icon.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteNews(Number(id));
        });
    });
    tbody.querySelectorAll('.order-input').forEach(input => {
        input.addEventListener('change', function() {
            const id = this.getAttribute('data-id');
            updateOrder(Number(id), this.value);
        });
    });
}

// Filters
function filterNews() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filtered = allNews;
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(news => 
            news.title.toLowerCase().includes(searchTerm) ||
            news.excerpt.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    if (statusFilter) {
        filtered = filtered.filter(news => news.status === statusFilter);
    }
    
    // Apply category filter
    if (categoryFilter) {
        filtered = filtered.filter(news => news.category === categoryFilter);
    }
    
    renderNewsTable(filtered);
}

// Open "Add News Item" modal
function openAddModal() {
    editingNewsId = null;
    document.getElementById('modalTitle').textContent = 'Add News Item';
    document.getElementById('submitBtnText').textContent = 'Save News Item';
    document.getElementById('newsForm').reset();
    document.getElementById('currentImagePreview').style.display = 'none';
    
    // Set default date to today
    document.getElementById('date').valueAsDate = new Date();
    
    document.getElementById('newsModal').style.display = 'block';
}

// Edit news item
async function editNews(id) {
    editingNewsId = id;
    
    try {
        const response = await fetch(`/api/admin/news/${id}`);
        const news = await response.json();
        
        // Populate form
        document.getElementById('modalTitle').textContent = 'Edit News Item';
        document.getElementById('submitBtnText').textContent = 'Update News Item';
        document.getElementById('title').value = news.title;
        document.getElementById('excerpt').value = news.excerpt;
        document.getElementById('category').value = news.category;

        // Format date as YYYY-MM-DD for input[type="date"] using local time
        let dateValue = '';
        if (news.date) {
            const d = new Date(news.date);
            if (!isNaN(d)) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateValue = `${year}-${month}-${day}`;
            }
        }
        document.getElementById('date').value = dateValue;
        
        document.getElementById('external_url').value = news.external_url || '';
        document.getElementById('status').value = news.status;
        document.getElementById('display_order').value = news.display_order;
        
        // Show current image if exists
        if (news.image_filename) {
            document.getElementById('currentImage').src = `../images/news/${news.image_filename}`;
            document.getElementById('currentImagePreview').style.display = 'block';
        } else {
            document.getElementById('currentImagePreview').style.display = 'none';
        }
        
        document.getElementById('newsModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading news item:', error);
        showError('Failed to load news item');
    }
}

// Delete news item
async function deleteNews(id) {
    if (!confirm('Are you sure you want to delete this news item? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/news/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('News item deleted successfully');
            loadNews();
        } else {
            showError(data.error || 'Failed to delete news item');
        }
    } catch (error) {
        console.error('Error deleting news:', error);
        showError('Failed to delete news item');
    }
}

// Update display order
async function updateOrder(id, order) {
    try {
        const response = await fetch(`/api/admin/news/${id}/order`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ display_order: parseInt(order) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadNews(); // Reload to reflect new order
        }
    } catch (error) {
        console.error('Error updating order:', error);
    }
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Remove empty fields
    if (!formData.get('external_url')) {
        formData.delete('external_url');
    }
    
    try {
        const url = editingNewsId 
            ? `/api/admin/news/${editingNewsId}`
            : '/api/admin/news';
        
        const method = editingNewsId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(editingNewsId ? 'News item updated successfully' : 'News item created successfully');
            closeModal();
            loadNews();
            loadCategories(); // Reload to show updated list
        } else {
            showError(data.error || 'Failed to save news item');
        }
    } catch (error) {
        console.error('Error saving news:', error);
        showError('Failed to save news item');
    }
}

// Close popup
function closeModal() {
    document.getElementById('newsModal').style.display = 'none';
    document.getElementById('newsForm').reset();
    editingNewsId = null;
}

// UTILITY FUNCTIONS

// Prevent special characters (e.g. &, ", >) in news content from breaking code
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert(message);
}