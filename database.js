require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ==============================
// CDSC APPLICATIONS
// ==============================

async function insertApplication(data) {
  const [seq] = await pool.query(
    "INSERT INTO application_sequences (type) VALUES ('individual')"
  );
  const gmcId = 'GMC' + String(seq.insertId).padStart(4, '0');
  data.gmc_id = gmcId;
  await pool.query('INSERT INTO applications SET ?', data);
  return gmcId;
}

async function getAllApplications() {
  const [rows] = await pool.query(
    'SELECT * FROM applications ORDER BY submission_date DESC'
  );
  return rows;
}

async function getApplication(id) {
  const [rows] = await pool.query(
    'SELECT * FROM applications WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateApplicationStatus(id, status, notes = null) {
  const [result] = await pool.query(
    'UPDATE applications SET status = ?, notes = ? WHERE id = ?',
    [status, notes, id]
  );
  return result;
}

async function deleteApplication(id) {
  const [result] = await pool.query(
    'DELETE FROM applications WHERE id = ?',
    [id]
  );
  return result;
}


// ==============================
// CORPORATE APPLICATIONS
// ==============================

async function insertCorporateApplication(data) {
  const [seq] = await pool.query(
    "INSERT INTO application_sequences (type) VALUES ('corporate')"
  );
  const gmcId = 'GMC' + String(seq.insertId).padStart(4, '0');
  data.gmc_id = gmcId;
  await pool.query('INSERT INTO corporate_applications SET ?', data);
  return gmcId;
}

async function getAllCorporateApplications() {
  const [rows] = await pool.query(
    'SELECT * FROM corporate_applications ORDER BY submission_date DESC'
  );
  return rows;
}

async function getCorporateApplication(id) {
  const [rows] = await pool.query(
    'SELECT * FROM corporate_applications WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateCorporateApplicationStatus(id, status, notes = null) {
  const [result] = await pool.query(
    'UPDATE corporate_applications SET status = ?, notes = ? WHERE id = ?',
    [status, notes, id]
  );
  return result;
}

async function deleteCorporateApplication(id) {
  const [result] = await pool.query(
    'DELETE FROM corporate_applications WHERE id = ?',
    [id]
  );
  return result;
}

// ==============================
// CONTACT MESSAGES
// ==============================

async function insertContactMessage(data) {
  const [result] = await pool.query(
    'INSERT INTO contact_messages SET ?',
    data
  );
  return result.insertId;
}

async function getAllContactMessages(status = null) {
  if (status) {
    const [rows] = await pool.query(
      'SELECT * FROM contact_messages WHERE status = ? ORDER BY submission_date DESC',
      [status]
    );
    return rows;
  } else {
    const [rows] = await pool.query(
      'SELECT * FROM contact_messages ORDER BY submission_date DESC'
    );
    return rows;
  }
}

async function getContactMessage(id) {
  const [rows] = await pool.query(
    'SELECT * FROM contact_messages WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateContactMessageStatus(id, status, respondedBy = null, adminNotes = null) {
  const [result] = await pool.query(
    `UPDATE contact_messages 
     SET status = ?, 
         response_date = CURRENT_TIMESTAMP,
         responded_by = ?, 
         admin_notes = ? 
     WHERE id = ?`,
    [status, respondedBy, adminNotes, id]
  );
  return result;
}

async function deleteContactMessage(id) {
  const [result] = await pool.query(
    'DELETE FROM contact_messages WHERE id = ?',
    [id]
  );
  return result;
}

async function getMessageCounts() {
  const [rows] = await pool.query(`
    SELECT 
      status,
      COUNT(*) AS count
    FROM contact_messages
    GROUP BY status
  `);

  const counts = {
    pending: 0,
    addressed: 0,
    ignored: 0
  };

  rows.forEach(row => {
    counts[row.status] = row.count;
  });

  return counts;
}

// ==============================
// NEWS ITEMS
// ==============================

async function insertNewsItem(newsData) {
  const [result] = await pool.query(
    `INSERT INTO news (
      title, excerpt, category, date, external_url, 
      image_filename, status, created_by, display_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newsData.title,
      newsData.excerpt,
      newsData.category,
      newsData.date,
      newsData.external_url || null,
      newsData.image_filename || null,
      newsData.status || 'published',
      newsData.created_by || 'admin',
      newsData.display_order || 0
    ]
  );
  
  return result.insertId;
}

async function getAllNews(filters = {}) {
  let query = 'SELECT * FROM news';
  const conditions = [];
  const params = [];
  
  // Filter by status
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  
  // Filter by category
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  
  // Where clause for additional conditions
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Order by display_order (ascending) then date (descending)
  query += ' ORDER BY display_order ASC, date DESC';
  
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getPublishedNews() {
  const [rows] = await pool.query(
    `SELECT * FROM news 
     WHERE status = 'published'
     ORDER BY display_order ASC, date DESC`
  );
  
  return rows;
}

async function getNewsItem(id) {
  const [rows] = await pool.query(
    'SELECT * FROM news WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateNewsItem(id, newsData) {
  const [result] = await pool.query(
    `UPDATE news SET
      title = ?,
      excerpt = ?,
      category = ?,
      date = ?,
      external_url = ?,
      image_filename = ?,
      status = ?,
      display_order = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      newsData.title,
      newsData.excerpt,
      newsData.category,
      newsData.date,
      newsData.external_url || null,
      newsData.image_filename || null,
      newsData.status || 'published',
      newsData.display_order || 0,
      id
    ]
  );
  
  return result.affectedRows > 0;
}

async function deleteNewsItem(id) {
  const [result] = await pool.query(
    'DELETE FROM news WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

async function updateDisplayOrder(id, order) {
  const [result] = await pool.query(
    'UPDATE news SET display_order = ? WHERE id = ?',
    [order, id]
  );
  return result.affectedRows > 0;
}

async function getNewsCounts() {
  const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM news');
  const [publishedRows] = await pool.query('SELECT COUNT(*) as count FROM news WHERE status = "published"');
  const [draftRows] = await pool.query('SELECT COUNT(*) as count FROM news WHERE status = "draft"');
  
  return {
    total: totalRows[0].count,
    published: publishedRows[0].count,
    draft: draftRows[0].count
  };
}

async function getCategories() {
  const [rows] = await pool.query(
    'SELECT DISTINCT category FROM news ORDER BY category ASC'
  );
  return rows.map(row => row.category);
}



module.exports = {
  pool,

  insertApplication,
  getAllApplications,
  getApplication,
  updateApplicationStatus,
  deleteApplication,

  insertCorporateApplication,
  getAllCorporateApplications,
  getCorporateApplication,
  updateCorporateApplicationStatus,
  deleteCorporateApplication,

  insertContactMessage,
  getAllContactMessages,
  getContactMessage,
  updateContactMessageStatus,
  deleteContactMessage,
  getMessageCounts,
  
  insertNewsItem,
  getAllNews,
  getPublishedNews,
  getNewsItem,
  updateNewsItem,
  deleteNewsItem,
  updateDisplayOrder,
  getNewsCounts,
  getCategories
};