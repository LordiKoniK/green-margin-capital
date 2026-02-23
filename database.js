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
  const [result] = await pool.query(
    'INSERT INTO applications SET ?',
    data
  );
  return result.insertId;
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

module.exports = {
  pool,
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