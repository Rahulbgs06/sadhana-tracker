const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
// for both loacl and production
app.use(cors({ 
    origin: ['http://localhost:5500', 'http://localhost:3000', 'https://rahulbgs06.github.io/sadhana-tracker/'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));
/*app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));*/
app.use(express.json());
console.log(`🌍 Server running in ${process.env.NODE_ENV || 'development'} mode`);

// ============================================
// DATABASE CONNECTION POOL
// ============================================
console.log('🔍 MySQL Connection Details:');
console.log('Host:', process.env.MYSQLHOST);
console.log('Port:', process.env.MYSQLPORT);
console.log('User:', process.env.MYSQLUSER);
console.log('Database:', process.env.MYSQL_DATABASE);
console.log('Password Set:', process.env.MYSQLPASSWORD ? '✅ YES' : '❌ NO');

const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQLPORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// ============================================
// DATABASE CONNECTIVITY TEST
// ============================================
(async function testDBConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully!');
        console.log(`📊 Connected to database: ${process.env.DB_NAME || 'sadhana_tracker'}`);
        
        // Test query to verify tables exist
        const [tables] = await connection.query('SHOW TABLES');
        console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]).join(', '));
        
        // Check if sadhana_entries table has the expected columns
        try {
            const [columns] = await connection.query('DESCRIBE sadhana_entries');
            console.log('✅ sadhana_entries table verified with', columns.length, 'columns');
        } catch (e) {
            console.error('❌ sadhana_entries table might be missing:', e.message);
        }
        
        connection.release();
    } catch (error) {
        console.error('❌ MySQL Connection Failed!');
        console.error('Error details:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.error('1. Make sure MySQL server is running');
        console.error('2. Check if database "sadhana_tracker" exists');
        console.error('3. Verify credentials in .env file:');
        console.error(`   Host: ${process.env.DB_HOST || 'NOT SET'}`);
        console.error(`   User: ${process.env.DB_USER || 'NOT SET'}`);
        console.error(`   Password: ${process.env.DB_PASSWORD ? 'NOT SET' : 'not set'}`);
        console.error(`   Database: ${process.env.DB_NAME || 'NOT SET'}`);
        console.error('\n💡 Run this SQL to create database:');
        console.error('CREATE DATABASE IF NOT EXISTS sadhana_tracker;');
    }
})();

// ============================================
// MYSQL CONNECTION ERROR HANDLER
// ============================================
pool.on('error', (err) => {
    console.error('❌ MySQL Pool Error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
        console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
        console.error('Database connection was refused.');
    }
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
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

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/api/health', async (req, res) => {
    const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            api: 'running',
            database: 'unknown'
        }
    };
    
    try {
        // Test database connection
        const [result] = await pool.query('SELECT 1 as connection_test');
        if (result && result[0] && result[0].connection_test === 1) {
            healthStatus.services.database = 'connected';
            
            // Get database stats
            const [dbStats] = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as user_count,
                    (SELECT COUNT(*) FROM sadhana_entries) as entry_count
            `);
            
            healthStatus.database = {
                userCount: dbStats[0].user_count,
                entryCount: dbStats[0].entry_count
            };
        }
    } catch (error) {
        healthStatus.services.database = 'disconnected';
        healthStatus.database = { error: error.message };
        healthStatus.status = 'DEGRADED';
    }
    
    res.json(healthStatus);
});

// ============================================
// DEBUG ENDPOINT - Check User Dashboard Data (using query param)
// ============================================
app.get('/api/debug/dashboard', authenticateToken, async (req, res) => {
    try {
        // Get userId from query parameter, or use logged-in user's ID
        const userId = req.query.userId || req.user.id;
        const days = 7; // weekly
        
        // Check if user has permission
        if (req.user.role === 'devotee' && req.user.id != userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get user info
        const [user] = await pool.query('SELECT id, name, voice_name, user_group, user_role FROM users WHERE id = ?', [userId]);
        
        if (!user.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get their sadhana entries for last 7 days
        const [entries] = await pool.query(
            `SELECT * FROM sadhana_entries 
             WHERE user_id = ? AND entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY entry_date DESC`,
            [userId, days]
        );
        
        res.json({
            user: user[0],
            entriesCount: entries.length,
            entries: entries,
            dateRange: {
                from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('Debug dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// --- LOGIN: Hardcoded Developer Fail-safe + DB Check ---
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
    } catch (e) { 
        console.error('Login error:', e);
        res.status(500).json({ error: 'Login failed' }); 
    }
});

// --- REGISTER new user ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, group, voice } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be min 6 characters' });
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (name, email, password, user_group, voice_name) VALUES (?, ?, ?, ?, ?)', [name, email, hash, group, voice]);
        res.status(201).json({ message: 'Success' });
    } catch (e) { 
        console.error('Registration error:', e);
        res.status(400).json({ error: 'Email already registered' }); 
    }
});

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

// --- GET all users (admin only) ---
app.get('/api/users/all', authenticateToken, async (req, res) => {
    if (req.user.role === 'devotee') return res.status(403).json({ error: 'Denied' });
    const { voice } = req.query;
    try {
        let sql = 'SELECT id, name, email, user_role, user_group, voice_name, DATE_FORMAT(created_at, "%Y-%m-%d") as created_at FROM users';
        let params = [];
        if (voice && voice !== 'All') { 
            sql += ' WHERE voice_name = ?'; 
            params.push(voice); 
        }
        const [rows] = await pool.query(sql + ' ORDER BY name ASC', params);
        res.json(rows);
    } catch (e) { 
        console.error('Fetch users error:', e);
        res.status(500).json({ error: 'Fetch failed' }); 
    }
});

// --- UPDATE user role (admin only) ---
app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
    if (req.user.role === 'devotee') return res.status(403).json({ error: 'Denied' });
    const { role } = req.body;
    try {
        await pool.query('UPDATE users SET user_role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Role updated' });
    } catch (e) { 
        console.error('Role update error:', e);
        res.status(500).json({ error: 'Update failed' }); 
    }
});

// ============================================
// SADHANA ENTRY ROUTES
// ============================================

// --- SAVE sadhana entry ---
app.post('/api/sadhana', authenticateToken, async (req, res) => {
    try {
        const {
            date, wakeup, rounds, chantEnd, hearing, reading, study, dayRest, sleep,
            to_bed, wake_up, day_rest_marks,
            morning_class, mangala_aarti, cleanliness,
            book_name, reflections,
            temp_hall_rech, time_wasted
        } = req.body;

        // ---------- BODY MARKS ----------
        const bodyMarks = (to_bed || 0) + (wake_up || 0) + (day_rest_marks || 0);
        const bodyPercent = Math.round((bodyMarks / 75) * 100);

        // ---------- SOUL MARKS ----------
        let activityCount = 0;

        if (reading > 0) activityCount++;
        if (hearing > 0) activityCount++;
        if (morning_class == 1) activityCount++;
        if (mangala_aarti == 1) activityCount++;

        const combinedMarks = (activityCount / 4) * 25;

        const japaMarks = rounds >= 16 ? 25 : (rounds / 16) * 25;
        const studyMarks = study >= 60 ? 10 : (study / 60) * 10;
        const cleanMarks = cleanliness ? 5 : 0;

        const soulMarks = combinedMarks + japaMarks + studyMarks + cleanMarks;
        const soulPercent = Math.round((soulMarks / 65) * 100);

        // ---------- INSERT ----------
        const sql = `
        INSERT INTO sadhana_entries
        (user_id, voice_name, entry_date, wakeup_time, rounds, chanting_end_time,
        hearing_minutes, reading_minutes, study_minutes, day_rest_time, sleep_time,
        to_bed, wake_up, day_rest_marks, morning_class, mangala_aarti,
        cleanliness, book_name, reflections, temp_hall_rech, time_wasted,
        body_marks, body_percent, soul_marks, soul_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            req.user.id,
            req.user.voice,
            date,
            wakeup || null,
            rounds || 0,
            chantEnd || null,
            hearing || 0,
            reading || 0,
            study || 0,
            dayRest || null,
            sleep || null,
            to_bed || 0,
            wake_up || 0,
            day_rest_marks || 0,
            morning_class || 0,
            mangala_aarti || 0,
            cleanliness || 0,
            book_name || null,
            reflections || null,
            temp_hall_rech || null,
            time_wasted || null,
            bodyMarks,
            bodyPercent,
            soulMarks,
            soulPercent
        ];

        await pool.query(sql, params);
        res.json({ message: 'Success' });

    } catch (e) {
        console.error('Save sadhana error:', e);
        if (e.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'Record already exists for this date' });
        res.status(500).json({ error: 'Database save failed' });
    }
});

// ============================================
// REPORTING ROUTES
// ============================================

// --- GET reports with filters ---
app.get('/api/reports', authenticateToken, async (req, res) => {
    const { voice, range, userId } = req.query;
    let query = `SELECT se.*, DATE_FORMAT(se.entry_date, "%Y-%m-%d") as date, u.name, u.user_group, u.voice_name FROM sadhana_entries se JOIN users u ON se.user_id = u.id WHERE 1=1`;
    let params = [];
    
    if (req.user.role === 'devotee') { 
        query += " AND u.id = ?"; 
        params.push(req.user.id); 
    } else {
        if (userId && userId !== 'All') { 
            query += " AND u.id = ?"; 
            params.push(userId); 
        }
        if (voice && voice !== 'All') { 
            query += " AND u.voice_name = ?"; 
            params.push(voice); 
        }
    }
    
    if (range === 'weekly') 
        query += " AND YEARWEEK(se.entry_date, 1) = YEARWEEK(CURDATE(), 1)";
    else if (range === 'monthly') 
        query += " AND MONTH(se.entry_date) = MONTH(CURDATE()) AND YEAR(se.entry_date) = YEAR(CURDATE())";
    
    query += ' ORDER BY se.entry_date DESC';
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (e) {
        console.error('Reports error:', e);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// --- SEARCH sadhana entries ---
app.get('/api/search', authenticateToken, async (req, res) => {
    const { date, name, voice, userId } = req.query;
    let query = `SELECT se.*, DATE_FORMAT(se.entry_date, "%Y-%m-%d") as date, u.name, u.user_group, u.voice_name FROM sadhana_entries se JOIN users u ON se.user_id = u.id WHERE 1=1`;
    let params = [];
    
    if (req.user.role === 'devotee') { 
        query += " AND u.id = ?"; 
        params.push(req.user.id); 
    } else {
        if (voice && voice !== 'All') { 
            query += " AND u.voice_name = ?"; 
            params.push(voice); 
        }
        if (userId && userId !== 'All') { 
            query += " AND u.id = ?"; 
            params.push(userId); 
        }
        if (name) { 
            query += " AND u.name LIKE ?"; 
            params.push(`%${name}%`); 
        }
    }
    
    if (date) { 
        query += " AND se.entry_date = ?"; 
        params.push(date); 
    }
    
    query += ' ORDER BY se.entry_date DESC';
    
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (e) {
        console.error('Search error:', e);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ============================================
// DASHBOARD ROUTE - FIXED FOR DEVOTEE ACCESS
// ============================================
app.get('/api/dashboard/report', authenticateToken, async (req, res) => {
    // Use let instead of const so we can modify these variables
    let voice = req.query.voice;
    let group = req.query.group;
    const type = req.query.type;
    const days = type === 'weekly' ? 7 : 30;
    
    try {
        // --- ENFORCE ROLE-BASED ACCESS ---
        // FIX: Devotee can ONLY see their own data
        if (req.user.role === 'devotee') {
            // Force to ONLY this devotee's data - ignore any filters
            console.log('Devotee access - restricting to user ID:', req.user.id);
            
            // Get ONLY this specific devotee's data
            const [user] = await pool.query(
                'SELECT id, name, voice_name, user_group FROM users WHERE id = ?', 
                [req.user.id]
            );
            
            if (!user.length) return res.json([]);
            
            // Get their sadhana entries
            const [recs] = await pool.query(
                `SELECT * FROM sadhana_entries WHERE user_id = ? AND entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
                [req.user.id, days]
            );

            // Calculate stats for this single user
            const u = user[0];
            const wakeSuccess = recs.filter(r => r.wakeup_time && r.wakeup_time <= '04:30:00').length;
            const templeSuccess = recs.filter(r => r.temp_hall_rech && r.temp_hall_rech != '').length;
            const roundSuccess = recs.filter(r => r.rounds >= 16).length;
            const morningClassSuccess = recs.filter(r => r.morning_class == 1).length;
            const mangalaArtiSuccess = recs.filter(r => r.mangala_aarti == 1).length;
            const cleanSuccess = recs.filter(r => r.cleanliness == 1).length;
            const sleepSuccess = recs.filter(r => r.sleep_time && r.sleep_time <= '21:30:00').length;

            const totalHearing = recs.reduce((s, r) => s + (r.hearing_minutes || 0), 0);
            const totalReading = recs.reduce((s, r) => s + (r.reading_minutes || 0), 0);
            const totalStudy = recs.reduce((s, r) => s + (r.study_minutes || 0), 0);
            const totalRest = recs.reduce((s, r) => s + (r.day_rest_marks || 0), 0);
            
            const totalWaste = recs.reduce((s, r) => {
                if (r.time_wasted) {
                    const parts = r.time_wasted.split(':');
                    return s + (parseInt(parts[0] || 0) * 60) + (parseInt(parts[1] || 0));
                }
                return s;
            }, 0);

            // Return ONLY this user's data as a single-item array
            return res.json([{
                name: u.name, 
                voice: u.voice_name, 
                group: u.user_group,
                wakeSuccess, 
                templeSuccess, 
                roundSuccess,
                morningClassSuccess, 
                mangalaArtiSuccess, 
                cleanSuccess,
                sleepSuccess,
                totalRounds: recs.reduce((s, r) => s + (r.rounds || 0), 0),
                totalHearing,
                totalReading,
                totalStudy,
                totalRest,
                totalWaste
            }]);
        }

        // --- ADMIN/DEVELOPER ACCESS - Can see filtered data ---
        console.log('Admin access - using requested voice:', voice, 'group:', group);
        
        // 1. Fetch Users with proper filtering for admin
        let uSql = `SELECT id, name, voice_name, user_group FROM users WHERE 1=1`;
        let uParams = [];
        
        if (voice && voice !== 'All' && voice !== 'undefined' && voice !== 'null') { 
            uSql += ` AND voice_name = ?`; 
            uParams.push(voice); 
        }
        
        if (group && group !== 'All' && group !== 'undefined' && group !== 'null') { 
            uSql += ` AND user_group = ?`; 
            uParams.push(group); 
        }
        
        const [users] = await pool.query(uSql, uParams);
        if (!users.length) return res.json([]);

        // 2. Aggregate Data for each user (admin only)
        const results = await Promise.all(users.map(async (u) => {
            const [recs] = await pool.query(
                `SELECT * FROM sadhana_entries WHERE user_id = ? AND entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
                [u.id, days]
            );

            const wakeSuccess = recs.filter(r => r.wakeup_time && r.wakeup_time <= '04:30:00').length;
            const templeSuccess = recs.filter(r => r.temp_hall_rech && r.temp_hall_rech != '').length;
            const roundSuccess = recs.filter(r => r.rounds >= 16).length;
            const morningClassSuccess = recs.filter(r => r.morning_class == 1).length;
            const mangalaArtiSuccess = recs.filter(r => r.mangala_aarti == 1).length;
            const cleanSuccess = recs.filter(r => r.cleanliness == 1).length;
            const sleepSuccess = recs.filter(r => r.sleep_time && r.sleep_time <= '21:30:00').length;

            const totalHearing = recs.reduce((s, r) => s + (r.hearing_minutes || 0), 0);
            const totalReading = recs.reduce((s, r) => s + (r.reading_minutes || 0), 0);
            const totalStudy = recs.reduce((s, r) => s + (r.study_minutes || 0), 0);
            const totalRest = recs.reduce((s, r) => s + (r.day_rest_marks || 0), 0);
            
            const totalWaste = recs.reduce((s, r) => {
                if (r.time_wasted) {
                    const parts = r.time_wasted.split(':');
                    return s + (parseInt(parts[0] || 0) * 60) + (parseInt(parts[1] || 0));
                }
                return s;
            }, 0);

            return {
                name: u.name, 
                voice: u.voice_name, 
                group: u.user_group,
                wakeSuccess, 
                templeSuccess, 
                roundSuccess,
                morningClassSuccess, 
                mangalaArtiSuccess, 
                cleanSuccess,
                sleepSuccess,
                totalRounds: recs.reduce((s, r) => s + (r.rounds || 0), 0),
                totalHearing,
                totalReading,
                totalStudy,
                totalRest,
                totalWaste
            };
        }));
        
        res.json(results);
    } catch (e) { 
        console.error('Dashboard error:', e);
        res.status(500).json({ error: 'Dashboard failed: ' + e.message }); 
    }
});

// ============================================
// VOICES ROUTE
// ============================================
app.get('/api/voices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT voice_name as name FROM users UNION SELECT name FROM voices ORDER BY name ASC');
        res.json(rows.map(r => r.name).filter(n => n)); 
    } catch (e) { 
        console.error('Voices error:', e);
        res.json([]); 
    }
});

// ============================================
// SERVER START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0',() => {   // ← Add '0.0.0.0' here!
    console.log(`🚀 Sadhana Tracker Backend Ready on port ${PORT}`);
    console.log(`📝 API endpoints available at http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Debug dashboard: http://localhost:${PORT}/api/debug/dashboard`);
});