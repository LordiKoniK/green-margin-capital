// ==========================================
// PUBLIC NEWS PAGE (DYNAMIC LOADING FROM BACKEND)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadPublicNews();
});

async function loadPublicNews() {
    try {
        const response = await fetch('/api/news');
        
        if (!response.ok) {
            throw new Error('Failed to load news');
        }
        
        const newsItems = await response.json();
        renderNews(newsItems);
    } catch (error) {
        console.error('Error loading news:', error);
        showErrorMessage();
    }
}

function renderNews(newsItems) {
    const container = document.querySelector('.news-section .container');
    
    if (!container) return;
    
    if (newsItems.length === 0) {
        container.innerHTML = `
            <div class="empty-news-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h3>No news available</h3>
                <p>Check back soon for updates on the latest developments in Kenyan capital markets.</p>
            </div>
        `;
        return;
    }
    
    const newsHTML = newsItems.map(news => createNewsArticle(news)).join('');
    container.innerHTML = newsHTML;
}

function createNewsArticle(news) {
    const imageUrl = news.image_filename 
        ? `../images/news/${news.image_filename}` 
        : '../images/news-placeholder.jpg';
    
    const externalUrl = news.external_url || '#';
    const hasLink = news.external_url && news.external_url.trim() !== '';
    
    return `
        <article class="news-item">
            <div class="news-image">
                <img src="${imageUrl}" alt="${escapeHtml(news.title)}" onerror="this.src='../images/news-placeholder.jpg'">
            </div>
            <div class="news-content">
                <div class="news-meta">
                    <span class="news-date">${formatDate(news.date)}</span>
                    <span class="news-category">${escapeHtml(news.category)}</span>
                </div>
                <h2 class="news-title">
                    ${hasLink ? `
                        <a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtml(news.title)}
                        </a>
                    ` : `
                        ${escapeHtml(news.title)}
                    `}
                </h2>
                <p class="news-excerpt">
                    ${escapeHtml(news.excerpt)}
                </p>
                ${hasLink ? `
                    <a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" class="news-read-more">
                        Find out more
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                ` : ''}
            </div>
        </article>
    `;
}

function formatDate(dateString) {
    // Handle MySQL date format (YYYY-MM-DD)
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showErrorMessage() {
    const container = document.querySelector('.news-section .container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-news-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Unable to load news</h3>
            <p>Please try refreshing the page. If the problem persists, contact support.</p>
        </div>
    `;
}