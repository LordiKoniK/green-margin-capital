// ==========================================
// Market Ticker - NSE Stock Data Display
// ==========================================

class MarketTicker {
  constructor() {
    this.container = document.getElementById('market-ticker');
    this.apiUrl = '/api/stocks';
    this.stockData = [];
    this.refreshInterval = 420000; // Refresh every 420 seconds (same time it takes to get to end of list)
    this.init();
  }

  async init() {
    if (!this.container) return;
    
    // Initial fetch
    await this.fetchStockData();
    
    // Auto-refresh
    setInterval(() => this.fetchStockData(), this.refreshInterval);
  }

  async fetchStockData() {
    try {
      const response = await fetch(this.apiUrl, this.apiOptions);
      
      const result = await response.text();
      
      const parsedData = JSON.parse(result);
      
      if (parsedData && parsedData.data && Array.isArray(parsedData.data)) {
        this.stockData = parsedData.data;
      } else if (Array.isArray(parsedData)) {
        this.stockData = parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        this.stockData = Object.values(parsedData).filter(item => 
          item && typeof item === 'object' && item.ticker
        );
      } else {
        throw new Error('Unexpected data format');
      }
       
      this.renderTicker();
    } catch (error) {
      console.error('Error fetching stock data:', error);
      console.error('Error details:', error.message);
      this.showError();
    }
  }

  renderTicker() {
    if (!this.stockData || this.stockData.length === 0) {
      this.showError('No stock data available');
      return;
    }

    this.container.innerHTML = '';

    const tickerTrack = document.createElement('div');
    tickerTrack.className = 'ticker-track';

    const tickerContent = this.createTickerItems();

    const duplicatedContent = tickerContent + tickerContent;
    
    tickerTrack.innerHTML = duplicatedContent;

    this.container.appendChild(tickerTrack);

    setTimeout(() => {
      const halfWidth = tickerTrack.scrollWidth / 2;
      const pixelsPerSecond = 50;
      const duration = halfWidth / pixelsPerSecond;
      
      tickerTrack.style.animationDuration = `${duration}s`;
      
    }, 100);
  }

  createTickerItems() {
    const items = this.stockData.map((stock, index) => {
      const ticker = stock.ticker || 'N/A';
      const price = parseFloat(stock.price || 0);
      const change = parseFloat(stock.change || 0);
      
      const isPositive = change >= 0;
      const changeClass = isPositive ? 'positive' : 'negative';
      const arrow = isPositive ? '▲' : '▼';

      return `
        <div class="ticker-item" data-index="${index}" data-ticker="${ticker}">
          <span class="ticker-symbol">${ticker}</span>
          <span class="ticker-price">KES ${this.formatPrice(price)}</span>
          <span class="ticker-change ${changeClass}">
            ${arrow} ${Math.abs(change).toFixed(2)}
          </span>
        </div>
      `;
    }).join('');
    
    return items;
  }

  truncateName(name, maxLength = 20) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }

  formatPrice(price) {
    const numPrice = parseFloat(price);
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  }

  showError(message = 'Unable to load market data') {
    this.container.innerHTML = `
      <div class="ticker-error">
        <span>⚠️ ${message}</span>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MarketTicker();
});