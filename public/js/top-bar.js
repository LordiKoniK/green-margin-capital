// ==========================================
// TOP BAR - DATE/TIME & MARKET STATUS
// ==========================================

function updateDateTime() {
    const now = new Date();
    // Get Nairobi time
    const nairobiDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

    // Date format: "Wednesday Feb 20 2026"
    const weekday = nairobiDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Africa/Nairobi' });
    const month = nairobiDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'Africa/Nairobi' });
    const day = nairobiDate.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Africa/Nairobi' });
    const year = nairobiDate.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Africa/Nairobi' });
    const datePart = `${weekday} ${month} ${day} ${year}`;

    // Time format: "2:45:12 PM EAT"
    const timePart = nairobiDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Africa/Nairobi'
    });

    const formatted = `${datePart}, ${timePart} EAT`;
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = formatted;
    }
}

function updateMarketStatus() {     // OPEN Monday-Friday 9:31 AM - 3:00 PM Nairobi time, CLOSED otherwise
    const now = new Date();
    
    // Get Nairobi time
    const nairobiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const hours = nairobiTime.getHours();
    const minutes = nairobiTime.getMinutes();
    const day = nairobiTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    const statusElement = document.getElementById('marketStatusText');
    
    if (!statusElement) return;
    
    // Check if weekday (Monday = 1, Friday = 5)
    const isWeekday = day >= 1 && day <= 5;
    
    // NSE trading hours: 9:31 AM - 3:00 PM
    const currentTimeInMinutes = hours * 60 + minutes;
    const marketOpenTime = 9 * 60 + 31;  // 9:31 AM
    const marketCloseTime = 15 * 60;      // 3:00 PM
    
    const isMarketOpen = isWeekday && 
                        currentTimeInMinutes >= marketOpenTime && 
                        currentTimeInMinutes < marketCloseTime;
    
    if (isMarketOpen) {
        statusElement.textContent = 'OPEN';
        statusElement.className = 'market-status-text open';
    } else {
        statusElement.textContent = 'CLOSED';
        statusElement.className = 'market-status-text closed';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update immediately
    updateDateTime();
    updateMarketStatus();
    
    // Update every second
    setInterval(() => {
        updateDateTime();
        updateMarketStatus();
    }, 1000);
});