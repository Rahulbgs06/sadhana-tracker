const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
//enable cors & json parsing
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Sadhana@123',
    database: process.env.DB_NAME || 'sadhana_tracker',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10
}).promise();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Session required' });
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Session expired' });
        req.user = user;
        next();
    });
};

// --- AUTH: Hardcoded Developer Fail-safe + DB Check ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // 1. HARDCODED DEVELOPER CHECK (Fail-safe)
    if (email === "dev@sadhna.com" && password === "admin123") {
        const token = jwt.sign({ id: 0, role: 'developer', voice: 'All', name: 'System Developer' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        return res.json({ token, user: { id: 0, name: 'System Developer', role: 'developer', voice: 'All', group: 'Sahdev' } });
    }

    // 2. DATABASE CHECK
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not registered' });
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, role: user.user_role, voice: user.voice_name, name: user.name, group: user.user_group }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.user_role, voice: user.voice_name, group: user.user_group } });
    } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

// --- USER MANAGEMENT ---
app.get('/api/users/all', authenticateToken, async (req, res) => {
    if (req.user.role === 'devotee') return res.status(403).json({ error: 'Denied' });
    const { voice } = req.query;
    try {
        let sql = 'SELECT id, name, email, user_role, user_group, voice_name, DATE_FORMAT(created_at, "%Y-%m-%d") as created_at FROM users';
        let params = [];
        if (voice && voice !== 'All') { sql += ' WHERE voice_name = ?'; params.push(voice); }
        const [rows] = await pool.query(sql + ' ORDER BY name ASC', params);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Fetch failed' }); }
});

app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
    if (req.user.role === 'devotee') return res.status(403).json({ error: 'Denied' });
    const { role } = req.body;
    try {
        await pool.query('UPDATE users SET user_role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Role updated' });
    } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// --- TRACKING & DYNAMIC REPORTS ---
app.get('/api/reports', authenticateToken, async (req, res) => {
    const { voice, range, userId } = req.query;
    let query = `SELECT se.*, DATE_FORMAT(se.entry_date, "%Y-%m-%d") as date, u.name, u.user_group, u.voice_name FROM sadhana_entries se JOIN users u ON se.user_id = u.id WHERE 1=1`;
    let params = [];
    if (req.user.role === 'devotee') { query += " AND u.id = ?"; params.push(req.user.id); } 
    else {
        if (userId && userId !== 'All') { query += " AND u.id = ?"; params.push(userId); }
        if (voice && voice !== 'All') { query += " AND u.voice_name = ?"; params.push(voice); }
    }
    if (range === 'weekly') query += " AND YEARWEEK(se.entry_date, 1) = YEARWEEK(CURDATE(), 1)";
    else if (range === 'monthly') query += " AND MONTH(se.entry_date) = MONTH(CURDATE()) AND YEAR(se.entry_date) = YEAR(CURDATE())";
    query += ' ORDER BY se.entry_date DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
});

app.get('/api/search', authenticateToken, async (req, res) => {
    const { date, name, voice, userId } = req.query;
    let query = `SELECT se.*, DATE_FORMAT(se.entry_date, "%Y-%m-%d") as date, u.name, u.user_group, u.voice_name FROM sadhana_entries se JOIN users u ON se.user_id = u.id WHERE 1=1`;
    let params = [];
    if (req.user.role === 'devotee') { query += " AND u.id = ?"; params.push(req.user.id); } 
    else {
        if (voice && voice !== 'All') { query += " AND u.voice_name = ?"; params.push(voice); }
        if (userId && userId !== 'All') { query += " AND u.id = ?"; params.push(userId); }
        if (name) { query += " AND u.name LIKE ?"; params.push(`%${name}%`); }
    }
    if (date) { query += " AND se.entry_date = ?"; params.push(date); }
    query += ' ORDER BY se.entry_date DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
});

app.post('/api/sadhana', authenticateToken, async (req, res) => {
    try {
        const { date, wakeup, rounds, chantEnd, hearing, reading, study, dayRest, sleep } = req.body;
        // Day Rest is received as HH:MM. Backend stores as TIME (HH:MM:SS)
        const sql = `INSERT INTO sadhana_entries (user_id, voice_name, entry_date, wakeup_time, rounds, chanting_end_time, hearing_minutes, reading_minutes, study_minutes, day_rest_time, sleep_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [req.user.id, req.user.voice, date, wakeup || null, rounds || 0, chantEnd || null, hearing || 0, reading || 0, study || 0, dayRest || null, sleep || null];
        await pool.query(sql, params);
        res.json({ message: 'Success' });
    } catch (e) { 
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Record already exists for this date' });
        res.status(500).json({ error: 'Database save failed' }); 
    }
});

app.get('/api/voices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT voice_name as name FROM users UNION SELECT name FROM voices ORDER BY name ASC');
        res.json(rows.map(r => r.name).filter(n => n)); 
    } catch (e) { res.json([]); }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, group, voice } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be min 6 characters' });
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (name, email, password, user_group, voice_name) VALUES (?, ?, ?, ?, ?)', [name, email, hash, group, voice]);
        res.status(201).json({ message: 'Success' });
    } catch (e) { res.status(400).json({ error: 'Email already registered' }); }
});

app.listen(3000, () => console.log('🚀 Sadhana Tracker Backend Ready'));