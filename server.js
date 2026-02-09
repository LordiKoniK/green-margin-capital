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
      imgSrc: ["'self'", "data:", "https:"],
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

// API Routes (for future use)
app.post('/api/contact', (req, res) => {
  // Handle contact form submission
  const { name, email, message } = req.body;
  // TODO: Implement email sending or database storage
  res.json({ success: true, message: 'Thank you for contacting us!' });
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