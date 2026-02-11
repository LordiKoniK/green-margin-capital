require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://nairobi-stock-exchange-nse.p.rapidapi.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'home.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'about.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'products.html'));
});

app.get('/downloads', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'downloads.html'));
});

app.get('/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'contact.html'));
});

app.get('/cdsc', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'cdsc-application-form.html'));
});

// API Routes (for future use)
app.post('/api/contact', (req, res) => {
  // Handle contact form submission
  const { name, email, message } = req.body;
  // TODO: Implement email sending or database storage
  res.json({ success: true, message: 'Thank you for contacting us!' });
});


// NSE Stocks Proxy Route to keep API key secure


let stocksCache = { data: null, fetchedAt: 0 };
const CACHE_TTL = 60 * 1000; // 60 seconds

app.get('/api/stocks', async (req, res) => {
  try {
    const now = Date.now();

    // Serve from cache if still fresh
    if (stocksCache.data && (now - stocksCache.fetchedAt) < CACHE_TTL) {
      return res.json(stocksCache.data);
    }

    const response = await fetch('https://nairobi-stock-exchange-nse.p.rapidapi.com/stocks', {
      method: 'GET',
      headers: {
        'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'nairobi-stock-exchange-nse.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream API error' });
    }

    const data = await response.json();

    // Update cache
    stocksCache = { data, fetchedAt: now };

    res.json(data);
  } catch (err) {
    console.error('NSE proxy error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self' https://nairobi-stock-exchange-nse.p.rapidapi.com;");
  next();
});

// // 404 handler
// app.use((req, res) => {
//   res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
// });

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Green Margin Capital server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});