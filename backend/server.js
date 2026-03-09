const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:8000', 'https://rahulbgs06.github.io'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Sadhana@123',
    database: process.env.DB_NAME || 'sadhana_tracker',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Test database connection
async function testDBConnection() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully');
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        return false;
    }
}

// ---------- AUTH ROUTES ----------
// Register
app.post('/api/auth/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, group, phone } = req.body;

        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password_hash, group_name, phone) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, group || 'Sahdev', phone || '']
        );

        res.status(201).json({ 
            message: 'Registration successful',
            userId: result.insertId 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
app.post('/api/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Get user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                group: user.group_name,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ---------- SADHANA ROUTES ----------
// Save sadhana entry
app.post('/api/sadhana', authenticateToken, async (req, res) => {
    try {
        const { date, wakeup, rounds, chantEnd, hearing, reading, study, sleep } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Check if entry exists
        const [existing] = await pool.query(
            'SELECT id FROM sadhana_entries WHERE user_id = ? AND date = ?',
            [req.user.id, date]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Entry for this date already exists' });
        }

        // Insert entry
        await pool.query(
            `INSERT INTO sadhana_entries 
            (user_id, date, wakeup_time, rounds, chant_end_time, hearing_minutes, reading_minutes, study_minutes, sleep_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, 
                date, 
                wakeup || null, 
                rounds || 0, 
                chantEnd || null,
                hearing || 0, 
                reading || 0, 
                study || 0, 
                sleep || null
            ]
        );

        res.status(201).json({ message: 'Sadhana entry saved successfully' });

    } catch (error) {
        console.error('Save sadhana error:', error);
        res.status(500).json({ error: 'Server error while saving' });
    }
});

// Get user's sadhana entries
app.get('/api/sadhana', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM sadhana_entries WHERE user_id = ? ORDER BY date DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Fetch sadhana error:', error);
        res.status(500).json({ error: 'Server error while fetching' });
    }
});

// ---------- SEARCH ROUTE ----------
app.get('/api/search', authenticateToken, async (req, res) => {
    try {
        const { name, month } = req.query;
        let query = 'SELECT se.*, u.name FROM sadhana_entries se JOIN users u ON se.user_id = u.id';
        let params = [];

        if (req.user.role === 'devotee') {
            query += ' WHERE u.id = ?';
            params.push(req.user.id);
        } else if (name) {
            query += ' WHERE u.name LIKE ?';
            params.push(`%${name}%`);
        }

        if (month) {
            query += params.length ? ' AND' : ' WHERE';
            query += ' DATE_FORMAT(se.date, "%Y-%m") = ?';
            params.push(month);
        }

        query += ' ORDER BY se.date DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Server error during search' });
    }
});

// ---------- REPORTS ROUTE ----------
app.get('/api/reports', authenticateToken, async (req, res) => {
    try {
        const { name, fromDate, toDate } = req.query;
        
        let query = `
            SELECT 
                u.name,
                COUNT(*) as total_days,
                SUM(se.rounds) as total_rounds,
                SUM(se.hearing_minutes) as total_hearing,
                SUM(se.reading_minutes) as total_reading,
                SUM(se.study_minutes) as total_study,
                AVG(se.rounds) as avg_rounds,
                SEC_TO_TIME(AVG(TIME_TO_SEC(se.wakeup_time))) as avg_wakeup,
                SEC_TO_TIME(AVG(TIME_TO_SEC(se.sleep_time))) as avg_sleep,
                SEC_TO_TIME(AVG(TIME_TO_SEC(se.chant_end_time))) as avg_chant_end
            FROM sadhana_entries se
            JOIN users u ON se.user_id = u.id
            WHERE 1=1
        `;
        let params = [];

        if (req.user.role === 'devotee') {
            query += ' AND u.id = ?';
            params.push(req.user.id);
        } else if (name) {
            query += ' AND u.name LIKE ?';
            params.push(`%${name}%`);
        }

        if (fromDate) {
            query += ' AND se.date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            query += ' AND se.date <= ?';
            params.push(toDate);
        }

        query += ' GROUP BY u.name ORDER BY u.name';

        const [rows] = await pool.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Reports error:', error);
        res.status(500).json({ error: 'Server error generating reports' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    const dbConnected = await testDBConnection();
    if (!dbConnected) {
        console.error('❌ Failed to connect to database. Exiting...');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📍 API URL: http://localhost:${PORT}`);
    });
}

startServer();
