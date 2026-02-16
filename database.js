const Database = require('better-sqlite3');
const path = require('path');

// Create database file in a secure location
const db = new Database(path.join(__dirname, 'cdsc_applications.db'));

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Account Type
      account_type TEXT NOT NULL,
      cda_code TEXT,
      cds_account_number TEXT,
      
      -- Primary Client Details
      primary_surname TEXT NOT NULL,
      primary_other_names TEXT NOT NULL,
      primary_dob DATE NOT NULL,
      primary_gender TEXT NOT NULL,
      primary_investor_category TEXT NOT NULL,
      primary_id_type TEXT NOT NULL,
      primary_id_number TEXT NOT NULL,
      primary_passport_expiry DATE,
      primary_nationality TEXT NOT NULL,
      primary_country_residence TEXT NOT NULL,
      primary_kra_pin TEXT NOT NULL,
      primary_passport_photo_path TEXT,
      
      -- Primary Contact Info
      primary_country_code TEXT NOT NULL,
      primary_phone TEXT NOT NULL,
      primary_email TEXT NOT NULL,
      primary_town_city TEXT NOT NULL,
      primary_physical_location TEXT NOT NULL,
      primary_postal_code TEXT,
      primary_postal_address TEXT,
      
      -- Primary Employment/Business
      primary_fund_source TEXT NOT NULL,
      primary_employer_name TEXT,
      primary_employer_postal TEXT,
      primary_employer_phone TEXT,
      primary_employer_email TEXT,
      primary_business_name TEXT,
      primary_business_reg_number TEXT,
      primary_business_postal TEXT,
      primary_business_phone TEXT,
      primary_business_email TEXT,
      primary_business_office TEXT,
      
      -- Secondary Client Details (for joint accounts)
      secondary_surname TEXT,
      secondary_other_names TEXT,
      secondary_dob DATE,
      secondary_gender TEXT,
      secondary_investor_category TEXT,
      secondary_id_type TEXT,
      secondary_id_number TEXT,
      secondary_passport_expiry DATE,
      secondary_nationality TEXT,
      secondary_country_residence TEXT,
      secondary_kra_pin TEXT,
      secondary_passport_photo_path TEXT,
      
      -- Secondary Contact Info
      secondary_country_code TEXT,
      secondary_phone TEXT,
      secondary_email TEXT,
      secondary_town_city TEXT,
      secondary_physical_location TEXT,
      secondary_postal_code TEXT,
      secondary_postal_address TEXT,
      
      -- Secondary Employment/Business
      secondary_fund_source TEXT,
      secondary_employer_name TEXT,
      secondary_employer_postal TEXT,
      secondary_employer_phone TEXT,
      secondary_employer_email TEXT,
      secondary_business_name TEXT,
      secondary_business_reg_number TEXT,
      secondary_business_postal TEXT,
      secondary_business_phone TEXT,
      secondary_business_email TEXT,
      secondary_business_office TEXT,
      
      -- PEP Status
      is_pep TEXT NOT NULL,
      pep_details TEXT,
      
      -- Payment Details
      payment_method TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      account_name TEXT,
      branch_code TEXT,
      swift_code TEXT,
      currency TEXT,
      other_currency TEXT,
      mobile_money_phone TEXT,
      
      -- Tax Status
      is_tax_exempt TEXT NOT NULL,
      tax_cert_path TEXT,
      
      -- Declaration
      signing_mandate TEXT NOT NULL,
      signer_names TEXT NOT NULL,
      signature_path TEXT NOT NULL,
      secondary_signer_names TEXT,
      secondary_signature_path TEXT,
      signature_date DATE NOT NULL,
      
      -- Status tracking
      status TEXT DEFAULT 'pending',
      notes TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Contact Details
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      
      -- Message Details
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      
      -- Status Tracking
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'addressed', 'ignored')),
      
      -- Response/Notes
      response_date DATETIME,
      responded_by TEXT,
      admin_notes TEXT,
      
      -- Metadata
      ip_address TEXT,
      user_agent TEXT
    )
  `);

  console.log('Database initialized successfully');
}

// Initialize the database
initializeDatabase();

// Helper function to insert applications
function insertApplication(data) {
  const stmt = db.prepare(`
    INSERT INTO applications (
      account_type, cda_code, cds_account_number,
      primary_surname, primary_other_names, primary_dob, primary_gender,
      primary_investor_category, primary_id_type, primary_id_number,
      primary_passport_expiry, primary_nationality, primary_country_residence,
      primary_kra_pin, primary_passport_photo_path,
      primary_country_code, primary_phone, primary_email, primary_physical_location,
      primary_town_city, primary_postal_code, primary_postal_address,
      primary_fund_source, primary_employer_name, primary_employer_postal,
      primary_employer_phone, primary_employer_email,
      primary_business_name, primary_business_reg_number, primary_business_postal,
      primary_business_phone, primary_business_email, primary_business_office,
      secondary_surname, secondary_other_names, secondary_dob, secondary_gender,
      secondary_investor_category, secondary_id_type, secondary_id_number,
      secondary_passport_expiry, secondary_nationality, secondary_country_residence,
      secondary_kra_pin, secondary_passport_photo_path,
      secondary_country_code, secondary_phone, secondary_email,
      secondary_physical_location, secondary_town_city, secondary_postal_code, secondary_postal_address,
      secondary_fund_source, secondary_employer_name, secondary_employer_postal,
      secondary_employer_phone, secondary_employer_email,
      secondary_business_name, secondary_business_reg_number, secondary_business_postal,
      secondary_business_phone, secondary_business_email, secondary_business_office,
      is_pep, pep_details,
      payment_method, bank_name, account_number, account_name,
      branch_code, swift_code, currency, other_currency, mobile_money_phone,
      is_tax_exempt, tax_cert_path,
      signing_mandate, signer_names, signature_path, secondary_signer_names, secondary_signature_path, signature_date
    ) VALUES (
      @account_type, @cda_code, @cds_account_number,
      @primary_surname, @primary_other_names, @primary_dob, @primary_gender,
      @primary_investor_category, @primary_id_type, @primary_id_number,
      @primary_passport_expiry, @primary_nationality, @primary_country_residence,
      @primary_kra_pin, @primary_passport_photo_path,
      @primary_country_code, @primary_phone, @primary_email, @primary_physical_location,
      @primary_town_city, @primary_postal_code, @primary_postal_address,
      @primary_fund_source, @primary_employer_name, @primary_employer_postal,
      @primary_employer_phone, @primary_employer_email,
      @primary_business_name, @primary_business_reg_number, @primary_business_postal,
      @primary_business_phone, @primary_business_email, @primary_business_office,
      @secondary_surname, @secondary_other_names, @secondary_dob, @secondary_gender,
      @secondary_investor_category, @secondary_id_type, @secondary_id_number,
      @secondary_passport_expiry, @secondary_nationality, @secondary_country_residence,
      @secondary_kra_pin, @secondary_passport_photo_path,
      @secondary_country_code, @secondary_phone, @secondary_email,
      @secondary_physical_location, @secondary_town_city, @secondary_postal_code, @secondary_postal_address,
      @secondary_fund_source, @secondary_employer_name, @secondary_employer_postal,
      @secondary_employer_phone, @secondary_employer_email,
      @secondary_business_name, @secondary_business_reg_number, @secondary_business_postal,
      @secondary_business_phone, @secondary_business_email, @secondary_business_office,
      @is_pep, @pep_details,
      @payment_method, @bank_name, @account_number, @account_name,
      @branch_code, @swift_code, @currency, @other_currency, @mobile_money_phone,
      @is_tax_exempt, @tax_cert_path,
      @signing_mandate, @signer_names, @signature_path, @secondary_signer_names, @secondary_signature_path, @signature_date
    )
  `);

  const info = stmt.run(data);
  return info.lastInsertRowid;
}

// Get all applications
function getAllApplications() {
  const stmt = db.prepare('SELECT * FROM applications ORDER BY submission_date DESC');
  return stmt.all();
}

// Get single application
function getApplication(id) {
  const stmt = db.prepare('SELECT * FROM applications WHERE id = ?');
  return stmt.get(id);
}

// Update application status
function updateApplicationStatus(id, status, notes = null) {
  const stmt = db.prepare('UPDATE applications SET status = ?, notes = ? WHERE id = ?');
  return stmt.run(status, notes, id);
}

// Delete application
function deleteApplication(id) {
  const stmt = db.prepare('DELETE FROM applications WHERE id = ?');
  return stmt.run(id);
}

// ==========================================
// CONTACT MESSAGES FUNCTIONS
// ==========================================

// Insert contact message
function insertContactMessage(data) {
  const stmt = db.prepare(`
    INSERT INTO contact_messages (
      first_name, last_name, email, phone, subject, message, ip_address, user_agent
    ) VALUES (
      @first_name, @last_name, @email, @phone, @subject, @message, @ip_address, @user_agent
    )
  `);
  const info = stmt.run(data);
  return info.lastInsertRowid;
}

// Get all contact messages with optional status filter
function getAllContactMessages(status = null) {
  let query = 'SELECT * FROM contact_messages';
  if (status) {
    query += ' WHERE status = ?';
  }
  query += ' ORDER BY submission_date DESC';
  
  const stmt = db.prepare(query);
  return status ? stmt.all(status) : stmt.all();
}

// Get single contact message
function getContactMessage(id) {
  const stmt = db.prepare('SELECT * FROM contact_messages WHERE id = ?');
  return stmt.get(id);
}

// Update contact message status
function updateContactMessageStatus(id, status, respondedBy = null, adminNotes = null) {
  const stmt = db.prepare(`
    UPDATE contact_messages 
    SET status = ?, 
        response_date = CURRENT_TIMESTAMP, 
        responded_by = ?, 
        admin_notes = ? 
    WHERE id = ?
  `);
  return stmt.run(status, respondedBy, adminNotes, id);
}

// Delete contact message
function deleteContactMessage(id) {
  const stmt = db.prepare('DELETE FROM contact_messages WHERE id = ?');
  return stmt.run(id);
}

// Get message counts by status
function getMessageCounts() {
  const stmt = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count
    FROM contact_messages
    GROUP BY status
  `);
  const results = stmt.all();
  
  const counts = { pending: 0, addressed: 0, ignored: 0 };
  results.forEach(row => {
    counts[row.status] = row.count;
  });
  
  return counts;
}

module.exports = {
  db,
  insertApplication,
  getAllApplications,
  getApplication,
  updateApplicationStatus,
  deleteApplication,
  insertContactMessage,
  getAllContactMessages,
  getContactMessage,
  updateContactMessageStatus,
  deleteContactMessage,
  getMessageCounts
};