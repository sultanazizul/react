const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sig_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Tes koneksi
pool.getConnection()
    .then(conn => {
        console.log('Connected to MySQL database successfully');
        conn.release();
    })
    .catch(err => {
        console.error('Failed to connect to MySQL:', err);
    });

module.exports = pool;