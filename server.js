require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');
const { fillCDSCForm, generateCDSCFormPDF } = require('./pdfFiller');
const basicAuth = require('express-basic-auth');


const app = express();
const PORT = process.env.PORT || 3000;

// Configure file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDFs are allowed!'));
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')){
    fs.mkdirSync('uploads');
}
if (!fs.existsSync('generated-pdfs')){
    fs.mkdirSync('generated-pdfs');
}


// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://nairobi-stock-exchange-nse.p.rapidapi.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
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

// Admin route security
app.use('/admin', basicAuth({
    users: { 'admin': 'greenmnocap' },
    challenge: true,
    realm: 'CDSC Admin'
}));

app.use('/api/cdsc/applications', basicAuth({
    users: { 'admin': 'greenmnocap' },
    challenge: true
}));

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'admin.html'));
});

// API Routes (for future use)
app.post('/api/contact', (req, res) => {
  // Handle contact form submission
  const { name, email, message } = req.body;
  // TODO: Implement email sending or database storage
  res.json({ success: true, message: 'Thank you for contacting us!' });
});

// CDSC Application API Routes

// Submit CDSC application
app.post('/api/cdsc/submit', upload.fields([
  { name: 'primaryPassportPhoto', maxCount: 1 },
  { name: 'secondaryPassportPhoto', maxCount: 1 },
  { name: 'signatureImage', maxCount: 1 },
  { name: 'secondarySignatureImage', maxCount: 1 },
  { name: 'taxCertificate', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    
    // Add file paths to data
    if (req.files['primaryPassportPhoto']) {
      data.primary_passport_photo_path = req.files['primaryPassportPhoto'][0].path;
    }
    if (req.files['secondaryPassportPhoto']) {
      data.secondary_passport_photo_path = req.files['secondaryPassportPhoto'][0].path;
    }
    if (req.files['signatureImage']) {
      data.signature_path = req.files['signatureImage'][0].path;
    }
    if (req.files['secondarySignatureImage']) {
      data.secondary_signature_path = req.files['secondarySignatureImage'][0].path;
    }
    if (req.files['taxCertificate']) {
      data.tax_cert_path = req.files['taxCertificate'][0].path;
    }

    // Insert into database
    const applicationId = db.insertApplication(data);
    
    res.json({ 
      success: true, 
      message: 'Application submitted successfully!',
      applicationId: applicationId
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting application',
      error: error.message 
    });
  }
});

// Get all applications (admin only - you should add authentication)
app.get('/api/cdsc/applications', (req, res) => {
  try {
    // TODO: Add authentication middleware
    const applications = db.getAllApplications();
    res.json({ success: true, applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching applications' 
    });
  }
});

// Get single application
app.get('/api/cdsc/applications/:id', (req, res) => {
  try {
    // TODO: Add authentication middleware
    const application = db.getApplication(req.params.id);
    if (application) {
      res.json({ success: true, application });
    } else {
      res.status(404).json({ success: false, message: 'Application not found' });
    }
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching application' 
    });
  }
});

// Update application status
app.patch('/api/cdsc/applications/:id/status', (req, res) => {
  try {
    // TODO: Add authentication middleware
    const { status, notes } = req.body;
    db.updateApplicationStatus(req.params.id, status, notes);
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating status' 
    });
  }
});

// Delete application
app.delete('/api/cdsc/applications/:id', (req, res) => {
  try {
    // TODO: Add authentication middleware
    db.deleteApplication(req.params.id);
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting application' 
    });
  }
});

// Generate filled PDF for an application
app.get('/api/cdsc/applications/:id/pdf', async (req, res) => {
  try {
    // TODO: Add authentication middleware
    const application = db.getApplication(req.params.id);
    
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Check tax exemption status unless forceDownload is set
    const forceDownload = req.query.forceDownload === '1' || req.query.forceDownload === 'true';
    if (!forceDownload && (application.is_tax_exempt === 'Yes' || application.is_tax_exempt === true)) {
      return res.json({
        success: true,
        taxExempt: true,
        message: 'Download tax exemption certificate?',
        taxCertPath: application.tax_cert_path,
        pdfAvailable: true
      });
    }

    const pdfPath = path.join(__dirname, 'generated-pdfs', `application-${req.params.id}.pdf`);

    // Try to fill the original PDF first, fallback to custom generation
    try {
      await fillCDSCForm(application, pdfPath);
    } catch (fillError) {
      console.log('Error filling PDF:', fillError.message);
    }

    // Send the PDF file
    res.download(pdfPath, `CDSC_Application_${req.params.id}.pdf`, (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
        res.status(500).json({ success: false, message: 'Error sending PDF' });
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF',
      error: error.message 
    });
  }
});

// Download tax exemption certificate file
app.get('/api/cdsc/applications/:id/tax-certificate', (req, res) => {
  try {
    const application = db.getApplication(req.params.id);
    if (!application || !application.tax_cert_path) {
      return res.status(404).json({ success: false, message: 'Tax certificate not found' });
    }
    const certPath = path.join(__dirname, application.tax_cert_path);
    res.download(certPath, `Tax_Exemption_Certificate_${req.params.id}${path.extname(certPath)}`, (err) => {
      if (err) {
        console.error('Error sending tax certificate:', err);
        res.status(500).json({ success: false, message: 'Error sending tax certificate' });
      }
    });
  } catch (error) {
    console.error('Error downloading tax certificate:', error);
    res.status(500).json({ success: false, message: 'Error downloading tax certificate', error: error.message });
  }
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