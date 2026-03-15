const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION - UPDATED CORS
// ============================================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:8000',
    'https://rahulbgs06.github.io',  // ✅ YEH ADD KARO (important!)
    'https://sadhana-tracker-production.up.railway.app'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
/*app.use(cors({ 
    origin: ['http://localhost:5500', 'http://localhost:3000', 'https://rahulbgs06.github.io/sadhana-tracker/'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));*/
/*app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));*/
app.use(express.json());
console.log(`🌍 Server running in ${process.env.NODE_ENV || 'development'} mode`);

// ============================================
// DATABASE CONNECTION - WITH EXTENSIVE DEBUGGING
// ============================================
const IS_RAILWAY = !!process.env.MYSQLHOST;

console.log('🔍 Environment:', IS_RAILWAY ? '🚂 RAILWAY (PRODUCTION)' : '💻 LOCAL (DEVELOPMENT)');

// Log ALL relevant environment variables at startup
console.log('📋 Raw Environment Variables:');
console.log(`   MYSQLHOST: ${process.env.MYSQLHOST || 'not set'}`);
console.log(`   MYSQLPORT: ${process.env.MYSQLPORT || 'not set'}`);
console.log(`   MYSQLUSER: ${process.env.MYSQLUSER || 'not set'}`);
console.log(`   MYSQLDATABASE: ${process.env.MYSQLDATABASE || 'not set'}`);
console.log(`   MYSQLPASSWORD: ${process.env.MYSQLPASSWORD ? '✅ set' : '❌ not set'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'not set'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'not set'}`);

// Database configuration
const dbConfig = {
    host: IS_RAILWAY ? process.env.MYSQLHOST : (process.env.DB_HOST || 'localhost'),
    port: IS_RAILWAY ? process.env.MYSQLPORT : (process.env.DB_PORT || 3306),
    user: IS_RAILWAY ? process.env.MYSQLUSER : (process.env.DB_USER || 'root'),
    password: IS_RAILWAY ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD || 'Sadhana@123'),
    database: IS_RAILWAY ? 'railway' : (process.env.DB_NAME || 'sadhana_tracker'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('📊 Final Database Config Used for Pool:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Password: ${dbConfig.password ? '✅ SET' : '❌ NOT SET'}`);

const pool = mysql.createPool(dbConfig).promise();

// ============================================
// DATABASE CONNECTIVITY TEST - FIXED
// ============================================
(async function testDBConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Pool connection acquired.');

        // Explicitly select the database we intend to use
        await connection.query(`USE ${dbConfig.database}`);
        console.log(`📊 Using database: ${dbConfig.database}`);

        // Now test tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]).join(', '));

        // Test users table specifically
        try {
            const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
            console.log(`👥 Users in database: ${users[0].count}`);
        } catch (e) {
            console.log('⚠️ Users table not accessible:', e.message);
        }

        connection.release();
        console.log('✅ Database connectivity test passed.');
    } catch (error) {
        console.error('❌ Database Connection Test Failed!');
        console.error('Error details:', error.message);
        console.error('This is likely why the container is stopping.');
        // Don't exit the process, let the app try to run, but it will fail on first query
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
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================
const authenticateAdmin = (req, res, next) => {
    // First, ensure user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        // Check if user has admin or developer role
        if (user.role !== 'admin' && user.role !== 'developer') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        req.user = user;
        next();
    });
};

// ============================================
// GET /api/leaderboard/months - Get available months with data
// ============================================
app.get('/api/leaderboard/months', authenticateToken, async (req, res) => {
    try {
        // Get the user's voice
        const [userInfo] = await pool.query(
            'SELECT voice_name FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (!userInfo.length) {
            return res.json(['current']);
        }
        
        const userVoice = userInfo[0].voice_name;
        
        // Get distinct months where there's data for users in this voice
        const [months] = await pool.query(
            `SELECT DISTINCT DATE_FORMAT(se.entry_date, '%Y-%m') as month 
             FROM sadhana_entries se
             JOIN users u ON se.user_id = u.id
             WHERE u.voice_name = ?
             ORDER BY month DESC
             LIMIT 12`,
            [userVoice]
        );
        
        const monthList = months.map(m => m.month);
        // Always include 'current' as first option
        res.json(['current', ...monthList]);
        
    } catch (error) {
        console.error('Error fetching months:', error);
        res.json(['current']);
    }
});

// ============================================
// GET /api/leaderboard - Get leaderboard data for all users in same voice
// ============================================
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { month, group } = req.query;
        const currentUserId = req.user.id;
        const userRole = req.user.role;
        
        // Calculate date range based on month parameter
        let startDate, endDate;
        const today = new Date();
        
        if (month === 'current' || !month) {
            // Current month (from 1st till today)
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        } else {
            // Specific month (format: YYYY-MM)
            const [year, monthNum] = month.split('-');
            startDate = `${year}-${monthNum}-01`;
            
            // Get last day of month
            const lastDay = new Date(year, monthNum, 0).getDate();
            endDate = `${year}-${monthNum}-${lastDay}`;
        }
        
        console.log(`📊 Leaderboard request: user=${req.user.id}, role=${userRole}, month=${month}, from=${startDate} to=${endDate}`);
        
        // First, get the current user's voice
        const [userInfo] = await pool.query(
            'SELECT voice_name FROM users WHERE id = ?',
            [currentUserId]
        );
        
        if (!userInfo.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userVoice = userInfo[0].voice_name;
        console.log(`🎯 User voice: ${userVoice}`);
        
        // Get ALL users in the SAME VOICE (including the current user)
        let userQuery = `
            SELECT id, name, user_group, voice_name 
            FROM users 
            WHERE voice_name = ? AND user_role = 'devotee'
        `;
        let userParams = [userVoice];
        
        // Add group filter if specified
        if (group && group !== 'All' && group !== 'undefined' && group !== 'null') {
            userQuery += ` AND user_group = ?`;
            userParams.push(group);
        }
        
        userQuery += ` ORDER BY name ASC`;
        
        const [allUsers] = await pool.query(userQuery, userParams);
        console.log(`👥 Found ${allUsers.length} users in voice "${userVoice}"`);
        
        if (allUsers.length === 0) {
            return res.json([]);
        }
        
        // For each user, get their sadhana data for the period
        const leaderboardData = await Promise.all(allUsers.map(async (user) => {
            const [records] = await pool.query(
                `SELECT * FROM sadhana_entries 
                 WHERE user_id = ? AND entry_date BETWEEN ? AND ?`,
                [user.id, startDate, endDate]
            );
            
            // Calculate soul activities (boolean fields)
            const morningClassSuccess = records.filter(r => r.morning_class == 1).length;
            const mangalaArtiSuccess = records.filter(r => r.mangala_aarti == 1).length;
            const cleanSuccess = records.filter(r => r.cleanliness == 1).length;
            
            // Calculate body success metrics
            const wakeSuccess = records.filter(r => r.wakeup_time && r.wakeup_time <= '04:30:00').length;
            const templeSuccess = records.filter(r => r.temp_hall_rech && r.temp_hall_rech != '').length;
            const roundSuccess = records.filter(r => r.rounds >= 16).length;
            const sleepSuccess = records.filter(r => r.sleep_time && r.sleep_time <= '21:30:00').length;
            
            // Calculate totals
            const totalRounds = records.reduce((s, r) => s + (r.rounds || 0), 0);
            const totalHearing = records.reduce((s, r) => s + (r.hearing_minutes || 0), 0);
            const totalReading = records.reduce((s, r) => s + (r.reading_minutes || 0), 0);
            const totalStudy = records.reduce((s, r) => s + (r.study_minutes || 0), 0);
            
            // Calculate day counts
            const daysActive = records.length;
            
            // Calculate averages for time fields
            let avgWakeup = null;
            let avgTemple = null;
            let avgSleep = null;
            
            if (records.length > 0) {
                // Filter out null/empty times and calculate average
                const wakeupTimes = records.filter(r => r.wakeup_time).map(r => {
                    const [h, m] = r.wakeup_time.split(':');
                    return parseInt(h) * 60 + parseInt(m);
                });
                if (wakeupTimes.length > 0) {
                    const avgMinutes = wakeupTimes.reduce((a, b) => a + b, 0) / wakeupTimes.length;
                    const hours = Math.floor(avgMinutes / 60);
                    const minutes = Math.floor(avgMinutes % 60);
                    avgWakeup = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
                
                const templeTimes = records.filter(r => r.temp_hall_rech).map(r => {
                    const [h, m] = r.temp_hall_rech.split(':');
                    return parseInt(h) * 60 + parseInt(m);
                });
                if (templeTimes.length > 0) {
                    const avgMinutes = templeTimes.reduce((a, b) => a + b, 0) / templeTimes.length;
                    const hours = Math.floor(avgMinutes / 60);
                    const minutes = Math.floor(avgMinutes % 60);
                    avgTemple = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
                
                const sleepTimes = records.filter(r => r.sleep_time).map(r => {
                    const [h, m] = r.sleep_time.split(':');
                    return parseInt(h) * 60 + parseInt(m);
                });
                if (sleepTimes.length > 0) {
                    const avgMinutes = sleepTimes.reduce((a, b) => a + b, 0) / sleepTimes.length;
                    const hours = Math.floor(avgMinutes / 60);
                    const minutes = Math.floor(avgMinutes % 60);
                    avgSleep = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
            }
            
            return {
                id: user.id,
                name: user.name,
                group: user.user_group,
                voice: user.voice_name,
                
                // Soul activities
                morningClassSuccess,
                mangalaArtiSuccess,
                cleanSuccess,
                
                // Body success counts
                wakeSuccess,
                templeSuccess,
                roundSuccess,
                sleepSuccess,
                
                // Totals
                totalRounds,
                totalHearing,
                totalReading,
                totalStudy,
                
                // Averages
                avgWakeup,
                avgTemple,
                avgSleep,
                
                // Metadata
                daysActive,
                recordCount: records.length
            };
        }));
        
        console.log(`✅ Returning leaderboard with ${leaderboardData.length} users`);
        res.json(leaderboardData);
        
    } catch (error) {
        console.error('❌ Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to load leaderboard data: ' + error.message });
    }
});

// ============================================
// GET /api/admin/marks-config
// Get all voice configurations
// ============================================
app.get('/api/admin/marks-config', authenticateAdmin, async (req, res) => {
    try {
        const [configs] = await pool.query(
            `SELECT mc.*, u.name as created_by_name, u2.name as updated_by_name 
             FROM marks_config mc
             LEFT JOIN users u ON mc.created_by = u.id
             LEFT JOIN users u2 ON mc.updated_by = u2.id
             ORDER BY mc.voice_name`
        );
        
        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('Error fetching configs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch configurations' 
        });
    }
});

// ============================================
// GET /api/admin/marks-config/:voice
// Get configuration for a specific voice
// ============================================
app.get('/api/admin/marks-config/:voice', authenticateAdmin, async (req, res) => {
    try {
        const voice = req.params.voice;
        
        const [configs] = await pool.query(
            `SELECT * FROM marks_config WHERE voice_name = ?`,
            [voice]
        );
        
        if (configs.length === 0) {
            // If no specific config, return global default
            const [globalConfig] = await pool.query(
                `SELECT * FROM marks_config WHERE voice_name = 'all'`
            );
            
            if (globalConfig.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'No configuration found' 
                });
            }
            
            return res.json({
                success: true,
                data: globalConfig[0],
                isGlobal: true,
                message: 'Using global default configuration'
            });
        }
        
        res.json({
            success: true,
            data: configs[0],
            isGlobal: false
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch configuration' 
        });
    }
});

// ============================================
// POST /api/admin/marks-config
// Create or update configuration (with confirmation)
// ============================================
app.post('/api/admin/marks-config', authenticateAdmin, async (req, res) => {
    const { voiceName, configData, changeReason, confirmed } = req.body;
    
    // Validation
    if (!voiceName || !configData) {
        return res.status(400).json({ 
            success: false, 
            error: 'Voice name and config data are required' 
        });
    }
    
    // If not confirmed, return preview
    if (!confirmed) {
        // Get current config if exists
        const [existing] = await pool.query(
            `SELECT * FROM marks_config WHERE voice_name = ?`,
            [voiceName]
        );
        
        return res.json({
            success: true,
            requiresConfirmation: true,
            preview: {
                voice: voiceName,
                currentConfig: existing.length > 0 ? existing[0].config_data : null,
                newConfig: configData,
                changes: calculateChanges(existing[0]?.config_data, configData)
            }
        });
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
        // Check if config already exists
        const [existing] = await connection.query(
            `SELECT * FROM marks_config WHERE voice_name = ?`,
            [voiceName]
        );
        
        let configId;
        
        if (existing.length > 0) {
            // Update existing config
            
            // Save to history first
            await connection.query(
                `INSERT INTO marks_config_history 
                 (config_id, changed_by, old_config, new_config, change_reason) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    existing[0].id, 
                    req.user.id, 
                    JSON.stringify(existing[0].config_data),
                    JSON.stringify(configData),
                    changeReason || 'Updated via admin panel'
                ]
            );
            
            // Update the config
            await connection.query(
                `UPDATE marks_config 
                 SET config_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [JSON.stringify(configData), req.user.id, existing[0].id]
            );
            
            configId = existing[0].id;
        } else {
            // Insert new config
            const [result] = await connection.query(
                `INSERT INTO marks_config 
                 (voice_name, config_data, created_by, updated_by) 
                 VALUES (?, ?, ?, ?)`,
                [voiceName, JSON.stringify(configData), req.user.id, req.user.id]
            );
            
            configId = result.insertId;
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Configuration saved successfully',
            configId: configId
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error saving config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save configuration' 
        });
    } finally {
        connection.release();
    }
});

// Helper function to calculate changes (optional)
function calculateChanges(oldConfig, newConfig) {
    if (!oldConfig) return { type: 'new', summary: 'New configuration created' };
    
    // Simple change detection - can be enhanced
    return {
        type: 'update',
        summary: 'Configuration updated'
    };
}
// ============================================
// GET /api/admin/marks-config-history/:voice
// Get change history for a voice
// ============================================
app.get('/api/admin/marks-config-history/:voice', authenticateAdmin, async (req, res) => {
    try {
        const voice = req.params.voice;
        
        // First get the config id
        const [configs] = await pool.query(
            `SELECT id FROM marks_config WHERE voice_name = ?`,
            [voice]
        );
        
        if (configs.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No configuration found for this voice' 
            });
        }
        
        const configId = configs[0].id;
        
        // Get history with user names
        const [history] = await pool.query(
            `SELECT h.*, u.name as changed_by_name 
             FROM marks_config_history h
             LEFT JOIN users u ON h.changed_by = u.id
             WHERE h.config_id = ?
             ORDER BY h.changed_at DESC`,
            [configId]
        );
        
        res.json({
            success: true,
            data: history
        });
        
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch history' 
        });
    }
});

// ============================================
// GET /api/public/marks-config/:voice
// Get configuration for public use (no auth needed)
// Used by frontend calculator
// ============================================
app.get('/api/public/marks-config/:voice', async (req, res) => {
    try {
        const voice = req.params.voice;
        
        // Try to get voice-specific config first
        const [configs] = await pool.query(
            `SELECT config_data FROM marks_config 
             WHERE voice_name = ? AND is_active = 1`,
            [voice]
        );
        
        if (configs.length > 0) {
            return res.json({
                success: true,
                data: configs[0].config_data,
                voice: voice
            });
        }
        
        // Fallback to global default
        const [globalConfig] = await pool.query(
            `SELECT config_data FROM marks_config 
             WHERE voice_name = 'all' AND is_active = 1`
        );
        
        if (globalConfig.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No configuration found' 
            });
        }
        
        res.json({
            success: true,
            data: globalConfig[0].config_data,
            voice: 'all',
            isGlobal: true
        });
        
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch configuration' 
        });
    }
});

// ============================================
// GET /api/admin/voices-with-config
// Get all voices that have configurations
// ============================================
/*app.get('/api/admin/voices-with-config', authenticateAdmin, async (req, res) => {
    try {
        const [voices] = await pool.query(
            `SELECT voice_name, updated_at, 
             (SELECT name FROM users WHERE id = updated_by) as last_updated_by
             FROM marks_config 
             WHERE voice_name != 'all'
             ORDER BY voice_name`
        );
        
        // Also include 'all' as special option
        const [globalConfig] = await pool.query(
            `SELECT voice_name, updated_at,
             (SELECT name FROM users WHERE id = updated_by) as last_updated_by
             FROM marks_config WHERE voice_name = 'all'`
        );
        
        res.json({
            success: true,
            data: {
                global: globalConfig[0] || null,
                voices: voices
            }
        });
        
    } catch (error) {
        console.error('Error fetching voices:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch voices' 
        });
    }
});*/

// ============================================
// MARKS CONFIGURATION ENDPOINTS
// ============================================

// GET /api/admin/marks-config/:voice - Get config for a specific voice
app.get('/api/admin/marks-config/:voice', authenticateAdmin, async (req, res) => {
    try {
        const voice = req.params.voice;
        
        console.log(`📥 Fetching marks config for voice: ${voice}`);
        
        // Query the database
        const [configs] = await pool.query(
            `SELECT * FROM marks_config WHERE voice_name = ?`,
            [voice]
        );
        
        if (configs.length === 0) {
            // If no specific config, return default structure
            return res.json({
                success: true,
                data: {
                    rules: getDefaultRules()  // We'll define this function
                },
                isGlobal: voice === 'all',
                message: 'No configuration found, using defaults'
            });
        }
        
        // Parse the JSON config_data
        const configData = JSON.parse(configs[0].config_data);
        
        res.json({
            success: true,
            data: configData,
            isGlobal: false
        });
        
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch configuration: ' + error.message 
        });
    }
});

// POST /api/admin/marks-config - Save or update configuration
app.post('/api/admin/marks-config', authenticateAdmin, async (req, res) => {
    const { voiceName, configData, changeReason, confirmed } = req.body;
    
    console.log(`📤 Saving marks config for voice: ${voiceName}`);
    
    // Validation
    if (!voiceName || !configData) {
        return res.status(400).json({ 
            success: false, 
            error: 'Voice name and config data are required' 
        });
    }
    
    // If not confirmed, return preview
    if (!confirmed) {
        // Get current config if exists
        const [existing] = await pool.query(
            `SELECT * FROM marks_config WHERE voice_name = ?`,
            [voiceName]
        );
        
        return res.json({
            success: true,
            requiresConfirmation: true,
            preview: {
                voice: voiceName,
                currentConfig: existing.length > 0 ? JSON.parse(existing[0].config_data) : null,
                newConfig: configData
            }
        });
    }
    
    // Start transaction for confirmed save
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
        // Check if config already exists
        const [existing] = await connection.query(
            `SELECT * FROM marks_config WHERE voice_name = ?`,
            [voiceName]
        );
        
        let configId;
        
        if (existing.length > 0) {
            configId = existing[0].id;
            
            // Save to history first
            await connection.query(
                `INSERT INTO marks_config_history 
                 (config_id, changed_by, old_config, new_config, change_reason) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    configId, 
                    req.user.id, 
                    existing[0].config_data,
                    JSON.stringify(configData),
                    changeReason || 'Updated via admin panel'
                ]
            );
            
            // Update the config
            await connection.query(
                `UPDATE marks_config 
                 SET config_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [JSON.stringify(configData), req.user.id, configId]
            );
            
            console.log(`✅ Updated config for ${voiceName}`);
            
        } else {
            // Insert new config
            const [result] = await connection.query(
                `INSERT INTO marks_config 
                 (voice_name, config_data, created_by, updated_by) 
                 VALUES (?, ?, ?, ?)`,
                [voiceName, JSON.stringify(configData), req.user.id, req.user.id]
            );
            
            configId = result.insertId;
            console.log(`✅ Created new config for ${voiceName}`);
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Configuration saved successfully',
            configId: configId
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error saving config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save configuration: ' + error.message 
        });
    } finally {
        connection.release();
    }
});

// GET /api/admin/marks-config-history/:voice - Get change history
app.get('/api/admin/marks-config-history/:voice', authenticateAdmin, async (req, res) => {
    try {
        const voice = req.params.voice;
        
        // First get the config id
        const [configs] = await pool.query(
            `SELECT id FROM marks_config WHERE voice_name = ?`,
            [voice]
        );
        
        if (configs.length === 0) {
            return res.json({ 
                success: true, 
                data: [],
                message: 'No history found' 
            });
        }
        
        const configId = configs[0].id;
        
        // Get history with user names
        const [history] = await pool.query(
            `SELECT h.*, u.name as changed_by_name 
             FROM marks_config_history h
             LEFT JOIN users u ON h.changed_by = u.id
             WHERE h.config_id = ?
             ORDER BY h.changed_at DESC
             LIMIT 50`,
            [configId]
        );
        
        res.json({
            success: true,
            data: history
        });
        
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch history: ' + error.message 
        });
    }
});

// GET /api/admin/voices-with-config - Get all voices that have configurations
app.get('/api/admin/voices-with-config', authenticateAdmin, async (req, res) => {
    try {
        // Get all distinct voice names from marks_config
        const [voices] = await pool.query(
            `SELECT DISTINCT voice_name, updated_at, 
             (SELECT name FROM users WHERE id = updated_by) as last_updated_by
             FROM marks_config 
             WHERE voice_name != 'all'
             ORDER BY voice_name`
        );
        
        // Get global config separately
        const [globalConfig] = await pool.query(
            `SELECT voice_name, updated_at,
             (SELECT name FROM users WHERE id = updated_by) as last_updated_by
             FROM marks_config WHERE voice_name = 'all'`
        );
        
        // Also get all distinct voices from users table
        const [userVoices] = await pool.query(
            `SELECT DISTINCT voice_name as name FROM users WHERE voice_name IS NOT NULL`
        );
        
        // Combine and deduplicate
        const allVoices = [...new Set([...userVoices.map(v => v.name), ...voices.map(v => v.voice_name)])];
        
        res.json({
            success: true,
            data: {
                global: globalConfig[0] || null,
                voices: voices,
                allVoices: allVoices
            }
        });
        
    } catch (error) {
        console.error('Error fetching voices:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch voices: ' + error.message 
        });
    }
});

// PUBLIC ENDPOINT - GET /api/public/marks-config/:voice - Used by MarksCalculator
app.get('/api/public/marks-config/:voice', async (req, res) => {
    try {
        const voice = req.params.voice;
        
        console.log(`📢 Public request for marks config: ${voice}`);
        
        // Try to get voice-specific config first
        const [configs] = await pool.query(
            `SELECT config_data FROM marks_config 
             WHERE voice_name = ? AND is_active = 1`,
            [voice]
        );
        
        if (configs.length > 0) {
            const configData = JSON.parse(configs[0].config_data);
            return res.json({
                success: true,
                data: configData,
                voice: voice
            });
        }
        
        // Fallback to global default
        const [globalConfig] = await pool.query(
            `SELECT config_data FROM marks_config 
             WHERE voice_name = 'all' AND is_active = 1`
        );
        
        if (globalConfig.length > 0) {
            const configData = JSON.parse(globalConfig[0].config_data);
            return res.json({
                success: true,
                data: configData,
                voice: 'all',
                isGlobal: true
            });
        }
        
        // If no config found, return default rules
        return res.json({
            success: true,
            data: {
                rules: getDefaultRules()
            },
            voice: 'all',
            isGlobal: true,
            isDefault: true
        });
        
    } catch (error) {
        console.error('Error fetching public config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch configuration' 
        });
    }
});

// Helper function to get default rules
function getDefaultRules() {
    return {
        soul: [
            {
                id: 'hearing',
                name: 'Hearing',
                field: 'hearing_minutes',
                type: 'boolean',
                maxMarks: 5,
                conditions: [
                    { operator: '>', value: 0, marks: 5 }
                ]
            },
            {
                id: 'reading',
                name: 'Reading',
                field: 'reading_minutes',
                type: 'boolean',
                maxMarks: 5,
                conditions: [
                    { operator: '>', value: 0, marks: 5 }
                ]
            },
            {
                id: 'cleanliness',
                name: 'Cleanliness',
                field: 'cleanliness',
                type: 'boolean',
                maxMarks: 5,
                conditions: [
                    { operator: '=', value: 1, marks: 5 }
                ]
            },
            {
                id: 'morningClass',
                name: 'Morning Class',
                field: 'morning_class',
                type: 'boolean',
                maxMarks: 5,
                conditions: [
                    { operator: '=', value: 1, marks: 5 }
                ]
            },
            {
                id: 'mangalaArti',
                name: 'Mangala Arti',
                field: 'mangala_aarti',
                type: 'boolean',
                maxMarks: 5,
                conditions: [
                    { operator: '=', value: 1, marks: 5 }
                ]
            }
        ],
        body: [
            {
                id: 'earlyWakeup',
                name: 'Early Wakeup',
                field: 'wakeup_time',
                type: 'time',
                maxMarks: 25,
                conditions: [
                    { operator: '<=', value: '04:30', marks: 25 },
                    { operator: '<=', value: '05:00', marks: 20 },
                    { operator: '<=', value: '05:30', marks: 15 },
                    { operator: '<=', value: '06:00', marks: 10 },
                    { operator: '<=', value: '06:30', marks: 5 }
                ]
            },
            {
                id: 'earlyToBed',
                name: 'Early to Bed',
                field: 'to_bed_time',
                type: 'time',
                maxMarks: 25,
                conditions: [
                    { operator: '<=', value: '21:30', marks: 25 },
                    { operator: '<=', value: '22:00', marks: 20 },
                    { operator: '<=', value: '22:30', marks: 15 },
                    { operator: '<=', value: '23:00', marks: 10 },
                    { operator: '<=', value: '23:30', marks: 5 }
                ]
            },
            {
                id: 'templeReach',
                name: 'Temple Reach',
                field: 'temp_hall_rech',
                type: 'time',
                maxMarks: 25,
                conditions: [
                    { operator: '<=', value: '04:30', marks: 25 },
                    { operator: '<=', value: '05:00', marks: 20 },
                    { operator: '<=', value: '05:30', marks: 15 },
                    { operator: '<=', value: '06:00', marks: 10 },
                    { operator: '<=', value: '06:30', marks: 5 }
                ]
            },
            {
                id: 'dayRest',
                name: 'Day Rest',
                field: 'day_rest_marks',
                type: 'duration',
                maxMarks: 25,
                conditions: [
                    { operator: '<=', value: 15, marks: 25 },
                    { operator: '<=', value: 30, marks: 20 },
                    { operator: '<=', value: 45, marks: 15 },
                    { operator: '<=', value: 60, marks: 10 },
                    { operator: '<=', value: 75, marks: 5 }
                ]
            },
            {
                id: 'study',
                name: 'Study',
                field: 'study_minutes',
                type: 'duration',
                maxMarks: 25,
                conditions: [
                    { operator: '<=', value: 30, marks: 25 },
                    { operator: '<=', value: 60, marks: 20 },
                    { operator: '<=', value: 90, marks: 15 },
                    { operator: '<=', value: 120, marks: 10 }
                ]
            }
        ],
        japa: [
            {
                id: 'japaRounds',
                name: 'Japa Rounds',
                field: 'rounds',
                type: 'slab',
                maxMarks: 25,
                conditions: [
                    { operator: '>=', value: 16, marks: 25 },
                    { operator: '>=', value: 15, marks: 20 },
                    { operator: '>=', value: 14, marks: 15 },
                    { operator: '>=', value: 13, marks: 10 },
                    { operator: '>=', value: 12, marks: 5 }
                ]
            }
        ]
    };
}


// ============================================
// SERVER START - SIMPLE & SAFE (WORKS EVERYWHERE)
// ============================================
const PORT = process.env.PORT || 8080;

// '0.0.0.0' har jagah kaam karta hai - local bhi, production bhi
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sadhana Tracker Backend Ready on port ${PORT}`);
    console.log(`🌍 Listening on 0.0.0.0:${PORT} (accessible locally & publicly)`);
    console.log(`📝 Local URL: http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 Public URL: https://sadhana-tracker-production.up.railway.app:${PORT}`);
    }
});