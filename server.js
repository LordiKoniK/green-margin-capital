const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');
const { fillCDSCForm, fillCorporateForm } = require('./pdfFiller');
const basicAuth = require('express-basic-auth');


// Database routes for Contact Us page client messages
const { insertContactMessage, getAllContactMessages, getContactMessage, updateContactMessageStatus, deleteContactMessage, getMessageCounts } = require('./database');


const app = express();
const PORT = process.env.PORT;


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

// Storage configuration for news page images
const newsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'images', 'news');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

const newsUpload = multer({
  storage: newsStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed'));
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
      frameSrc: ["'self'", "https://www.google.com/", "https://www.youtube.com/", "https://www.youtube-nocookie.com/"],
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

app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'services.html'));
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

app.get('/services/technology', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'technology.html'));
});

// Admin routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'admin.html'));
});

app.get('/admin/messages', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'admin-messages.html'));
});

app.get('/admin/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'admin-news.html'));
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

app.use('/api/cdsc/corporate/applications', basicAuth({
    users: { 'admin': 'greenmnocap' },
    challenge: true
}));

app.use('/admin/messages', basicAuth({
    users: { 'admin': 'greenmnocap' },
    challenge: true
}));

app.use('/api/admin/contact-messages', basicAuth({
    users: { 'admin': 'greenmnocap' },
    challenge: true
}));

app.use('/api/admin/news', basicAuth({
    users: { 'admin': 'greenmnocap' },
    challenge: true
}));

// ==========================================
// CONTACT ROUTES
// ==========================================

// Public: Submit contact form
app.post('/api/contact', express.json(), async (req, res) => {
  const { firstName, lastName, email, phone, subject, message } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please fill in all required fields' 
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide a valid email address' 
    });
  }

  try {
    // Get metadata
    let ipAddress = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    // If x-forwarded-for is a list, take the first IP
    if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    const userAgent = req.get('user-agent') || 'unknown';
    
    fs.writeFileSync('request_debug.log', `DB_USER at request time: ${process.env.DB_USER}\n`);

    // Insert into database
    const messageId = await insertContactMessage({
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone || null,
      subject: subject,
      message: message,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    res.json({ 
      success: true, 
      message: 'Thank you for contacting us! We\'ll get back to you within 24 hours.',
      messageId: messageId
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Unable to submit your message. Please try again or contact us directly.' 
    });
  }
});

// Admin: Get all messages
app.get('/api/admin/contact-messages', async (req, res) => {

  const status = req.query.status || null; // Optional filter: ?status=pending

  try {
    const messages = await getAllContactMessages(status);
    const counts = await getMessageCounts();

    res.json({ 
      success: true, 
      messages: messages,
      counts: counts
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve messages' 
    });
  }
});

// Admin: Get single message
app.get('/api/admin/contact-messages/:id', async (req, res) => {

  const messageId = parseInt(req.params.id);

  try {
    const message = await getContactMessage(messageId);

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    res.json({ 
      success: true, 
      message: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve message' 
    });
  }
});

// Admin: Update message status
app.put('/api/admin/contact-messages/:id', express.json(), async (req, res) => {

  const messageId = parseInt(req.params.id);
  const { status, respondedBy, adminNotes } = req.body;

  // Validate status
  if (!['pending', 'addressed', 'ignored'].includes(status)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid status. Must be: pending, addressed, or ignored' 
    });
  }

  try {
    await updateContactMessageStatus(messageId, status, respondedBy, adminNotes);

    res.json({ 
      success: true, 
      message: 'Message status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update message status' 
    });
  }
});


// Admin: Delete message
app.delete('/api/admin/contact-messages/:id', async (req, res) => {

  const messageId = parseInt(req.params.id);

  try {
    await deleteContactMessage(messageId);

    res.json({ 
      success: true, 
      message: 'Message deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete message' 
    });
  }
});


// ==========================================
// CDSC APPLICATION ROUTES
// ==========================================

// Public: Submit CDSC application
app.post('/api/cdsc/submit', upload.fields([
  { name: 'primaryPassportPhoto', maxCount: 1 },
  { name: 'secondaryPassportPhoto', maxCount: 1 },
  { name: 'signatureImage', maxCount: 1 },
  { name: 'secondarySignatureImage', maxCount: 1 },
  { name: 'taxCertificate', maxCount: 1 },
  { name: 'kraPinCertificate', maxCount: 1 },
  { name: 'kraPinCertificate2', maxCount: 1 }
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
    if (req.files['kraPinCertificate']) {
      data.primary_kra_cert_path = req.files['kraPinCertificate'][0].path;
    }
    if (req.files['kraPinCertificate2']) { 
      data.secondary_kra_cert_path = req.files['kraPinCertificate2'][0].path;
    }

    // Insert into database
    const applicationId = await db.insertApplication(data);
    
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

// Get all applications 
app.get('/api/cdsc/applications', async (req, res) => {
  try {
    const applications = await db.getAllApplications();
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
app.get('/api/cdsc/applications/:id', async (req, res) => {
  try {
    const application = await db.getApplication(req.params.id);
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
app.patch('/api/cdsc/applications/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.updateApplicationStatus(req.params.id, status, notes);
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
app.delete('/api/cdsc/applications/:id', async (req, res) => {
  try {
    const application = await db.getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Also delete image files associated with the application
    const fileFields = [
      'primary_passport_photo_path',
      'secondary_passport_photo_path',
      'signature_path',
      'secondary_signature_path',
      'tax_cert_path',
      'primary_kra_cert_path',
      'secondary_kra_cert_path'
    ];

    fileFields.forEach(field => {
      const filePath = application[field];
      if (filePath && typeof filePath === 'string') {
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
        fs.unlink(absPath, err => {
          if (err && err.code !== 'ENOENT') {
            console.error(`Error deleting file (${field}):`, absPath, err.message);
          }
        });
      }
    });

    await db.deleteApplication(req.params.id);
    res.json({ success: true, message: 'Application and associated files deleted successfully' });
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
    const application = await db.getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const forceDownload = req.query.forceDownload === '1' || req.query.forceDownload === 'true';
    if (!forceDownload) {
      return res.json({
        success: true,
        hasTaxCert:       !!(application.is_tax_exempt === 'Yes' && application.tax_cert_path),
        kraCerts: {
          primary:   !!application.primary_kra_cert_path,
          secondary: !!application.secondary_kra_cert_path
        },
        pdfAvailable: true
      });
    }

    const pdfPath = path.join(__dirname, 'generated-pdfs', `application-${req.params.id}.pdf`);
    try {
      await fillCDSCForm(application, pdfPath);
    } catch (fillError) {
      console.log('Error filling PDF:', fillError.message);
    }
    res.download(pdfPath, `CDSC_Application_${req.params.id}.pdf`, (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
        res.status(500).json({ success: false, message: 'Error sending PDF' });
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: 'Error generating PDF', error: error.message });
  }
});

// Download tax exemption certificate file
app.get('/api/cdsc/applications/:id/tax-certificate', async (req, res) => {
  try {
    const application = await db.getApplication(req.params.id);
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

// Download KRA PIN certificate (individual/joint)
app.get('/api/cdsc/applications/:id/kra-certificate', async (req, res) => {
  try {
    const application = await db.getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const which = req.query.which || 'primary';
    const fieldMap = {
      primary:   'primary_kra_cert_path',
      secondary: 'secondary_kra_cert_path'
    };
    const field = fieldMap[which];
    if (!field || !application[field]) {
      return res.status(404).json({ success: false, message: 'KRA certificate not found' });
    }
    const certPath = path.join(__dirname, application[field]);
    const label = which === 'secondary' ? 'Secondary' : 'Primary';
    res.download(certPath, `KRA_Certificate_${label}_${req.params.id}${path.extname(certPath)}`, (err) => {
      if (err) {
        console.error('Error sending KRA certificate:', err);
        res.status(500).json({ success: false, message: 'Error sending KRA certificate' });
      }
    });
  } catch (error) {
    console.error('Error downloading KRA certificate:', error);
    res.status(500).json({ success: false, message: 'Error downloading KRA certificate', error: error.message });
  }
});


// ==========================================
// CORPORATE APPLICATION ROUTES
// ==========================================

// Public: Submit corporate application
app.post('/api/cdsc/corporate/submit', upload.fields([
  { name: 'signatureImage', maxCount: 1 },
  { name: 'secondarySignatureImage', maxCount: 1 },
  { name: 'corpKraCertificate', maxCount: 1 },
  { name: 'taxCertificate', maxCount: 1 },
  { name: 'sig1PassportPhoto', maxCount: 1 },
  { name: 'sig1KraCertificate', maxCount: 1 },
  { name: 'sig2PassportPhoto', maxCount: 1 },
  { name: 'sig2KraCertificate', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);

    if (req.files['signatureImage'])
      data.signature_path = req.files['signatureImage'][0].path;
    if (req.files['secondarySignatureImage'])
      data.secondary_signature_path = req.files['secondarySignatureImage'][0].path;
    if (req.files['corpKraCertificate'])
      data.kra_cert_path = req.files['corpKraCertificate'][0].path;
    if (req.files['taxCertificate'])
      data.tax_cert_path = req.files['taxCertificate'][0].path;
    if (req.files['sig1PassportPhoto'])
      data.sig1_passport_photo_path = req.files['sig1PassportPhoto'][0].path;
    if (req.files['sig1KraCertificate'])
      data.sig1_kra_cert_path = req.files['sig1KraCertificate'][0].path;
    if (req.files['sig2PassportPhoto'])
      data.sig2_passport_photo_path = req.files['sig2PassportPhoto'][0].path;
    if (req.files['sig2KraCertificate'])
      data.sig2_kra_cert_path = req.files['sig2KraCertificate'][0].path;

    const applicationId = await db.insertCorporateApplication(data);

    res.json({
      success: true,
      message: 'Corporate application submitted successfully!',
      applicationId
    });
  } catch (error) {
    console.error('Error submitting corporate application:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting corporate application',
      error: error.message
    });
  }
});

// Get all corporate applications
app.get('/api/cdsc/corporate/applications', async (req, res) => {
  try {
    const applications = await db.getAllCorporateApplications();
    res.json({ success: true, applications });
  } catch (error) {
    console.error('Error fetching corporate applications:', error);
    res.status(500).json({ success: false, message: 'Error fetching corporate applications' });
  }
});

// Get single corporate application
app.get('/api/cdsc/corporate/applications/:id', async (req, res) => {
  try {
    const application = await db.getCorporateApplication(req.params.id);
    if (application) {
      res.json({ success: true, application });
    } else {
      res.status(404).json({ success: false, message: 'Application not found' });
    }
  } catch (error) {
    console.error('Error fetching corporate application:', error);
    res.status(500).json({ success: false, message: 'Error fetching corporate application' });
  }
});

// Update corporate application status
app.patch('/api/cdsc/corporate/applications/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.updateCorporateApplicationStatus(req.params.id, status, notes);
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating corporate status:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

// Delete corporate application
app.delete('/api/cdsc/corporate/applications/:id', async (req, res) => {
  try {
    const application = await db.getCorporateApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const fileFields = [
      'signature_path', 'secondary_signature_path',
      'kra_cert_path', 'tax_cert_path',
      'sig1_passport_photo_path', 'sig1_kra_cert_path',
      'sig2_passport_photo_path', 'sig2_kra_cert_path'
    ];

    fileFields.forEach(field => {
      const filePath = application[field];
      if (filePath && typeof filePath === 'string') {
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
        fs.unlink(absPath, err => {
          if (err && err.code !== 'ENOENT')
            console.error(`Error deleting file (${field}):`, absPath, err.message);
        });
      }
    });

    await db.deleteCorporateApplication(req.params.id);
    res.json({ success: true, message: 'Corporate application and associated files deleted successfully' });
  } catch (error) {
    console.error('Error deleting corporate application:', error);
    res.status(500).json({ success: false, message: 'Error deleting corporate application' });
  }
});

// Generate filled PDF for a corporate application
app.get('/api/cdsc/corporate/applications/:id/pdf', async (req, res) => {
  try {
    const application = await db.getCorporateApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const forceDownload = req.query.forceDownload === '1' || req.query.forceDownload === 'true';
    if (!forceDownload) {
      return res.json({
        success: true,
        hasTaxCert: !!(application.is_tax_exempt === 'Yes' && application.tax_cert_path),
        kraCerts: {
          company: !!application.kra_cert_path,
          sig1:    !!application.sig1_kra_cert_path,
          sig2:    !!application.sig2_kra_cert_path
        },
        pdfAvailable: true
      });
    }

    const pdfPath = path.join(__dirname, 'generated-pdfs', `corporate-application-${req.params.id}.pdf`);
    try {
      await fillCorporateForm(application, pdfPath);
    } catch (fillError) {
      console.log('Error filling corporate PDF:', fillError.message);
    }
    res.download(pdfPath, `CDSC_Corporate_Application_${req.params.id}.pdf`, (err) => {
      if (err) {
        console.error('Error sending corporate PDF:', err);
        res.status(500).json({ success: false, message: 'Error sending PDF' });
      }
    });
  } catch (error) {
    console.error('Error generating corporate PDF:', error);
    res.status(500).json({ success: false, message: 'Error generating PDF', error: error.message });
  }
});

// Download corporate tax exemption certificate
app.get('/api/cdsc/corporate/applications/:id/tax-certificate', async (req, res) => {
  try {
    const application = await db.getCorporateApplication(req.params.id);
    if (!application || !application.tax_cert_path) {
      return res.status(404).json({ success: false, message: 'Tax certificate not found' });
    }
    const certPath = path.join(__dirname, application.tax_cert_path);
    res.download(certPath, `Corporate_Tax_Exemption_Certificate_${req.params.id}${path.extname(certPath)}`, (err) => {
      if (err) {
        console.error('Error sending tax certificate:', err);
        res.status(500).json({ success: false, message: 'Error sending tax certificate' });
      }
    });
  } catch (error) {
    console.error('Error downloading corporate tax certificate:', error);
    res.status(500).json({ success: false, message: 'Error downloading tax certificate', error: error.message });
  }
});

// Download KRA PIN certificate (corporate)
app.get('/api/cdsc/corporate/applications/:id/kra-certificate', async (req, res) => {
  try {
    const application = await db.getCorporateApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const which = req.query.which || 'company';
    const fieldMap = {
      company: 'kra_cert_path',
      sig1:    'sig1_kra_cert_path',
      sig2:    'sig2_kra_cert_path'
    };
    const labelMap = {
      company: 'Company',
      sig1:    'Signatory_1',
      sig2:    'Signatory_2'
    };
    const field = fieldMap[which];
    if (!field || !application[field]) {
      return res.status(404).json({ success: false, message: 'KRA certificate not found' });
    }
    const certPath = path.join(__dirname, application[field]);
    res.download(certPath, `KRA_Certificate_${labelMap[which]}_${req.params.id}${path.extname(certPath)}`, (err) => {
      if (err) {
        console.error('Error sending KRA certificate:', err);
        res.status(500).json({ success: false, message: 'Error sending KRA certificate' });
      }
    });
  } catch (error) {
    console.error('Error downloading KRA certificate:', error);
    res.status(500).json({ success: false, message: 'Error downloading KRA certificate', error: error.message });
  }
});

// ==========================================
// NEWS ROUTES
// ==========================================

// Public: Get all news (for frontend news page)
app.get('/api/news', async (req, res) => {
  try {
    const news = await db.getPublishedNews();
    res.json(news);
  } catch (error) {
    console.error('Error fetching published news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

//Admin: Get all news (for admin management page)
app.get('/api/admin/news', async (req, res) => {
  try {
    const { status, category } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (category) filters.category = category;
    
    const news = await db.getAllNews(filters);
    const counts = await db.getNewsCounts();
    
    res.json({
      news,
      counts
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Admin: Get all unique categories (for filters)
app.get('/api/admin/news/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Admin: Get single news item
app.get('/api/admin/news/:id', async (req, res) => {
  try {
    const newsItem = await db.getNewsItem(req.params.id);
    
    if (!newsItem) {
      return res.status(404).json({ error: 'News item not found' });
    }
    
    res.json(newsItem);
  } catch (error) {
    console.error('Error fetching news item:', error);
    res.status(500).json({ error: 'Failed to fetch news item' });
  }
});

// Admin: Create news item
app.post('/api/admin/news', newsUpload.single('image'), async (req, res) => {
  try {
    const newsData = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      category: req.body.category,
      date: req.body.date,
      external_url: req.body.external_url,
      status: req.body.status || 'published',
      display_order: parseInt(req.body.display_order) || 0,
      created_by: req.body.created_by || 'admin'
    };
    
    // Add image filename if uploaded
    if (req.file) {
      newsData.image_filename = req.file.filename;
    }
    
    // Validate required fields
    if (!newsData.title || !newsData.excerpt || !newsData.category || !newsData.date) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, excerpt, category, date' 
      });
    }
    
    const newsId = await db.insertNewsItem(newsData);
    
    res.status(201).json({
      success: true,
      id: newsId,
      message: 'News item created successfully'
    });
  } catch (error) {
    console.error('Error creating news item:', error);
    
    // Delete uploaded file if database insert failed
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to create news item' });
  }
});

// Admin: Update news item
app.put('/api/admin/news/:id', newsUpload.single('image'), async (req, res) => {
  try {
    const newsItem = await db.getNewsItem(req.params.id);
    
    if (!newsItem) {
      return res.status(404).json({ error: 'News item not found' });
    }
    
    const newsData = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      category: req.body.category,
      date: req.body.date,
      external_url: req.body.external_url,
      status: req.body.status || 'published',
      display_order: parseInt(req.body.display_order) || 0
    };
    
    // Handle image upload
    if (req.file) {
      // Delete old image if it exists
      if (newsItem.image_filename) {
        const oldImagePath = path.join(__dirname, 'public', 'images', 'news', newsItem.image_filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      newsData.image_filename = req.file.filename;
    } else {
      // Keep existing image
      newsData.image_filename = newsItem.image_filename;
    }
    
    const success = await db.updateNewsItem(req.params.id, newsData);
    
    if (success) {
      res.json({
        success: true,
        message: 'News item updated successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to update news item' });
    }
  } catch (error) {
    console.error('Error updating news item:', error);
    
    // Delete uploaded file if update failed
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to update news item' });
  }
});

// Admin: Delete news item
app.delete('/api/admin/news/:id', async (req, res) => {
  try {
    const newsItem = await db.getNewsItem(req.params.id);
    
    if (!newsItem) {
      return res.status(404).json({ error: 'News item not found' });
    }
    
    // Delete associated image if it exists
    if (newsItem.image_filename) {
      const imagePath = path.join(__dirname, 'public', 'images', 'news', newsItem.image_filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    const success = await db.deleteNewsItem(req.params.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'News item deleted successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete news item' });
    }
  } catch (error) {
    console.error('Error deleting news item:', error);
    res.status(500).json({ error: 'Failed to delete news item' });
  }
});

// Admin: Update news display order
app.patch('/api/admin/news/:id/order', async (req, res) => {  
  try {
    const { display_order } = req.body;
    
    if (display_order === undefined) {
      return res.status(400).json({ error: 'display_order is required' });
    }
    
    const success = await db.updateDisplayOrder(req.params.id, parseInt(display_order));
    
    if (success) {
      res.json({
        success: true,
        message: 'Display order updated successfully'
      });
    } else {
      res.status(404).json({ error: 'News item not found' });
    }
  } catch (error) {
    console.error('Error updating display order:', error);
    res.status(500).json({ error: 'Failed to update display order' });
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