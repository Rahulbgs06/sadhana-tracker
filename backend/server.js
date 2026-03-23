// Helper function to ensure time is in HH:MM:SS format
function formatTime(timeStr) {
  if (!timeStr) return null;
  // If already has seconds, return as is
  if (timeStr.split(':').length === 3) return timeStr;
  // If only HH:MM, add :00
  if (timeStr.split(':').length === 2) return `${timeStr}:00`;
  return timeStr;
}
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
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // HARDCODED DEVELOPER CHECK
    if (email === "dev@sadhna.com" && password === "admin123") {
        // ✅ FIX: Get the actual user from database instead of using ID 0
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        let userData;
        if (users.length > 0) {
            // Use existing user from database
            userData = users[0];
        } else {
            // If user doesn't exist, create a temporary one (or use ID 1)
            // But since you have the user, this won't run
            userData = { id: 1, name: 'System Developer', role: 'developer', voice_name: 'All', user_group: 'Sahdev' };
        }
        
        const token = jwt.sign(
            { id: userData.id, role: userData.user_role, voice: userData.voice_name, name: userData.name, group: userData.user_group }, 
            process.env.JWT_SECRET || 'your-secret-key', 
            { expiresIn: '7d' }
        );
        
        return res.json({ 
            token, 
            user: { 
                id: userData.id, 
                name: userData.name, 
                role: userData.user_role, 
                voice: userData.voice_name, 
                group: userData.user_group 
            } 
        });
    }

    // REGULAR USER LOGIN
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not registered' });
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign(
            { id: user.id, role: user.user_role, voice: user.voice_name, name: user.name, group: user.user_group }, 
            process.env.JWT_SECRET || 'your-secret-key', 
            { expiresIn: '7d' }
        );
        
        res.json({ 
            token, 
            user: { id: user.id, name: user.name, role: user.user_role, voice: user.voice_name, group: user.user_group } 
        });
        
    } catch (e) { 
        console.error('Login error:', e);
        res.status(500).json({ error: 'Login failed' }); 
    }
});
// --- LOGIN: Hardcoded Developer Fail-safe + DB Check ---
/*app.post('/api/auth/login', async (req, res) => {
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
});*/

//=======  REGISTER USER  ==========
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, group, voice } = req.body;
    
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be min 6 characters' });
    }
    
    try {
        // ✅ FIX: Check if email already exists FIRST
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (name, email, password, user_group, voice_name) VALUES (?, ?, ?, ?, ?)', 
            [name, email, hash, group, voice]
        );
        
        res.status(201).json({ message: 'Success' });
        
    } catch (e) { 
        console.error('Registration error:', e);
        res.status(500).json({ error: 'Registration failed' }); 
    }
});
/*app.post('/api/auth/register', async (req, res) => {
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
});*/

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

app.post('/api/sadhana', authenticateToken, async (req, res) => {
    try {
        console.log('========== SAVE SADHANA REQUEST ==========');
        
        const {
            date, wakeup, rounds, chantEnd, hearing, reading, study,
            dayRestMinutes, sleep, temp_hall_rech, time_wasted,
            morning_class, mangala_aarti, cleanliness, book_name, reflections
        } = req.body;

        // Parse time_wasted from minutes to TIME format (HH:MM:SS)
        const wastedHours = Math.floor(parseInt(time_wasted) / 60);
        const wastedMinutes = parseInt(time_wasted) % 60;
        const wastedTime = `${wastedHours.toString().padStart(2, '0')}:${wastedMinutes.toString().padStart(2, '0')}:00`;

        // ============================================
        // SOUL MARKS CALCULATION
        // ============================================
        let soulMarks = 0;
        
        // 5 Soul Activities × 5 marks each = 25 marks
        if (parseInt(hearing) > 0) soulMarks += 5;
        if (parseInt(reading) > 0) soulMarks += 5;
        if (morning_class == 1 || morning_class === '1') soulMarks += 5;
        if (mangala_aarti == 1 || mangala_aarti === '1') soulMarks += 5;
        if (cleanliness == 1 || cleanliness === '1') soulMarks += 5;
        
        // Chanting End Marks - 25 marks
        if (chantEnd) {
            if (chantEnd <= '06:45') soulMarks += 25;
            else if (chantEnd <= '09:00') soulMarks += 20;
            else if (chantEnd <= '13:00') soulMarks += 15;
            else if (chantEnd <= '16:00') soulMarks += 10;
            else if (chantEnd <= '20:00') soulMarks += 5;
        }

        const soulPercent = Math.round((soulMarks / 50) * 100);

        // ============================================
        // BODY MARKS CALCULATION
        // ============================================
        let bodyMarks = 0;
        let wakeMarks = 0, bedMarks = 0, restMarks = 0;

        // Wakeup Marks
        if (wakeup) {
            if (wakeup <= '04:30') wakeMarks = 25;
            else if (wakeup <= '05:00') wakeMarks = 20;
            else if (wakeup <= '05:30') wakeMarks = 15;
            else if (wakeup <= '06:00') wakeMarks = 10;
            else if (wakeup <= '06:30') wakeMarks = 5;
            bodyMarks += wakeMarks;
        }

        // Sleep Marks (to_bed)
        if (sleep) {
            if (sleep <= '21:30') bedMarks = 25;
            else if (sleep <= '22:00') bedMarks = 20;
            else if (sleep <= '22:30') bedMarks = 15;
            else if (sleep <= '23:00') bedMarks = 10;
            else if (sleep <= '23:30') bedMarks = 5;
            bodyMarks += bedMarks;
        }

        // Day Rest Marks
        const rest = parseInt(dayRestMinutes) || 0;
        if (rest <= 30) restMarks = 25;
        else if (rest <= 45) restMarks = 20;
        else if (rest <= 60) restMarks = 15;
        else if (rest <= 75) restMarks = 10;
        else if (rest <= 90) restMarks = 5;
        bodyMarks += restMarks;

        const bodyPercent = Math.round((bodyMarks / 75) * 100);

        console.log('Marks calculated:', {
            soulMarks, soulPercent,
            wakeMarks, bedMarks, restMarks, bodyMarks, bodyPercent
        });

        console.log('🔍 DEBUG - Time values before insert:', {
          wakeup,
          chantEnd,
          sleep,
          temp_hall_rech,
          wastedTime
        });

        // Also check if user exists
        console.log('🔍 DEBUG - User info:', {
          userId: req.user.id,
          userVoice: req.user.voice
        });

        // ============================================
        // CORRECT INSERT QUERY with your actual columns
        // ============================================
        const query = `
            INSERT INTO sadhana_entries 
            (user_id, voice_name, entry_date, 
             wakeup_time, rounds, chanting_end_time,
             hearing_minutes, reading_minutes, study_minutes,
             day_rest_minutes, sleep_time,
             morning_class, mangala_aarti, cleanliness,
             book_name, reflections,
             temp_hall_rech, time_wasted,
             to_bed, wake_up, day_rest_marks,
             body_marks, body_percent, soul_marks, soul_percent)
            VALUES (?, ?, ?, 
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?)
        `;

        const values = [
            // Basic info
            req.user.id,
            req.user.voice,
            date,
            
            // Time fields
            wakeup,
            parseInt(rounds) || 0,
            chantEnd,
            
            // Minutes fields
            parseInt(hearing) || 0,
            parseInt(reading) || 0,
            parseInt(study) || 0,
            
            // Day rest
            parseInt(dayRestMinutes) || 0,
            sleep,
            
            // Boolean fields (tinyint)
            morning_class === '1' ? 1 : 0,
            mangala_aarti === '1' ? 1 : 0,
            cleanliness === '1' ? 1 : 0,
            
            // Text fields
            book_name || null,
            reflections || null,
            
            // Additional time fields
            temp_hall_rech,
            wastedTime,  // Converted to TIME format
            
            // Old columns (for backward compatibility)
            bedMarks,     // to_bed
            wakeMarks,    // wake_up
            restMarks,    // day_rest_marks
            
            // Marks and percentages
            bodyMarks,
            bodyPercent,
            soulMarks,
            soulPercent
        ];

        console.log('Executing query with values:', values);
        
        console.log('🔍 VALUES BEING INSERTED:');
        console.log('user_id:', values[0]);
        console.log('voice_name:', values[1]);
        console.log('entry_date:', values[2]);
        console.log('wakeup_time:', values[3]);
        console.log('rounds:', values[4]);
        console.log('chanting_end_time:', values[5]);
        console.log('hearing_minutes:', values[6]);
        console.log('reading_minutes:', values[7]);
        console.log('study_minutes:', values[8]);
        console.log('day_rest_minutes:', values[9]);
        console.log('sleep_time:', values[10]);
        console.log('morning_class:', values[11]);
        console.log('mangala_aarti:', values[12]);
        console.log('cleanliness:', values[13]);
        console.log('book_name:', values[14]);
        console.log('reflections:', values[15]);
        console.log('temp_hall_rech:', values[16]);
        console.log('time_wasted:', values[17]);
        console.log('to_bed:', values[18]);
        console.log('wake_up:', values[19]);
        console.log('day_rest_marks:', values[20]);
        console.log('body_marks:', values[21]);
        console.log('body_percent:', values[22]);
        console.log('soul_marks:', values[23]);
        console.log('soul_percent:', values[24]);

        const [result] = await pool.query(query, values);
        
        console.log('✅ Insert successful, ID:', result.insertId);
        
        res.json({ 
            success: true, 
            id: result.insertId,
            marks: {
                soul: soulMarks,
                soulPercent,
                body: bodyMarks,
                bodyPercent
            }
        });

    }  catch (error) {
    console.error('❌ Save sadhana error:', error);
    console.error('Error stack:', error.stack);
    console.error('SQL Error Code:', error.code);
    console.error('SQL Error Message:', error.sqlMessage);
    console.error('SQL:', error.sql);
    
    // Send detailed error to response for debugging
    res.status(500).json({ 
        error: error.message,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        code: error.code
    });
    }
});
// DELETE endpoint for test cleanup
app.delete('/api/sadhana', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    
    const [result] = await pool.query(
      'DELETE FROM sadhana_entries WHERE user_id = ? AND entry_date = ?',
      [userId, date]
    );
    
    res.json({ success: true, deleted: result.affectedRows });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
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
// FIXED: Dashboard Report Endpoint 
// ============================================
// ============================================
// FIXED: Dashboard Report Endpoint with proper voice filtering
// ============================================
app.get('/api/dashboard/report', authenticateToken, async (req, res) => {
    let voice = req.query.voice;
    let group = req.query.group;
    const type = req.query.type;
    const days = type === 'weekly' ? 7 : 30;
    
    try {
        // --- DEVOTEE ROLE ---
        if (req.user.role === 'devotee') {
            console.log('Devotee access - restricting to user ID:', req.user.id);
            
            const [user] = await pool.query(
                'SELECT id, name, voice_name, user_group FROM users WHERE id = ?', 
                [req.user.id]
            );
            
            if (!user.length) return res.json([]);
            
            const [entries] = await pool.query(
                `SELECT * FROM sadhana_entries 
                 WHERE user_id = ? AND entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 ORDER BY entry_date DESC`,
                [req.user.id, days]
            );

            const u = user[0];
            const latestEntry = entries[0] || {};
            
            const wakeSuccess = entries.filter(r => r.wakeup_time && r.wakeup_time <= '04:30:00').length;
            const templeSuccess = entries.filter(r => r.temp_hall_rech && r.temp_hall_rech != '').length;
            const roundSuccess = entries.filter(r => r.rounds >= 16).length;
            const morningClassSuccess = entries.filter(r => r.morning_class == 1).length;
            const mangalaArtiSuccess = entries.filter(r => r.mangala_aarti == 1).length;
            const cleanSuccess = entries.filter(r => r.cleanliness == 1).length;
            const sleepSuccess = entries.filter(r => r.sleep_time && r.sleep_time <= '21:30:00').length;

            const totalRounds = entries.reduce((s, r) => s + (r.rounds || 0), 0);
            const totalHearing = entries.reduce((s, r) => s + (r.hearing_minutes || 0), 0);
            const totalReading = entries.reduce((s, r) => s + (r.reading_minutes || 0), 0);
            const totalStudy = entries.reduce((s, r) => s + (r.study_minutes || 0), 0);
            const totalRest = entries.reduce((s, r) => s + (r.day_rest_minutes || 0), 0);
            
            const totalSoulMarks = entries.reduce((s, r) => s + (r.soul_marks || 0), 0);
            const totalBodyMarks = entries.reduce((s, r) => s + (r.body_marks || 0), 0);
            const entryCount = entries.length;

            return res.json([{
                name: u.name,
                voice: u.voice_name,
                group: u.user_group,
                wakeup_time: latestEntry.wakeup_time,
                sleep_time: latestEntry.sleep_time,
                chanting_end_time: latestEntry.chanting_end_time,
                temp_hall_rech: latestEntry.temp_hall_rech,
                hearing_minutes: latestEntry.hearing_minutes,
                reading_minutes: latestEntry.reading_minutes,
                study_minutes: latestEntry.study_minutes,
                morning_class: latestEntry.morning_class,
                mangala_aarti: latestEntry.mangala_aarti,
                cleanliness: latestEntry.cleanliness,
                rounds: latestEntry.rounds,
                day_rest_minutes: latestEntry.day_rest_minutes,
                wakeSuccess,
                templeSuccess,
                roundSuccess,
                morningClassSuccess,
                mangalaArtiSuccess,
                cleanSuccess,
                sleepSuccess,
                totalRounds,
                totalHearing,
                totalReading,
                totalStudy,
                totalRest,
                total_soul_marks: totalSoulMarks,
                total_body_marks: totalBodyMarks,
                entry_count: entryCount
            }]);
        }

        // --- ADMIN/DEVELOPER ROLE - WITH PROPER VOICE FILTERING ---
        console.log(`👑 Admin access - voice: ${voice}, group: ${group}, days: ${days}`);
        
        let query = `
            SELECT 
                u.id,
                u.name,
                u.voice_name as voice,
                u.user_group as \`group\`,
                COUNT(se.id) as entry_count,
                COALESCE(SUM(se.soul_marks), 0) as total_soul_marks,
                COALESCE(SUM(se.body_marks), 0) as total_body_marks,
                COALESCE(SUM(se.rounds), 0) as total_rounds,
                COALESCE(SUM(se.hearing_minutes), 0) as total_hearing,
                COALESCE(SUM(se.reading_minutes), 0) as total_reading,
                COALESCE(SUM(se.study_minutes), 0) as total_study,
                COALESCE(SUM(se.day_rest_minutes), 0) as total_rest,
                SUM(CASE WHEN se.wakeup_time <= '04:30' THEN 1 ELSE 0 END) as wake_success,
                SUM(CASE WHEN se.temp_hall_rech IS NOT NULL AND se.temp_hall_rech != '' THEN 1 ELSE 0 END) as temple_success,
                SUM(CASE WHEN se.rounds >= 16 THEN 1 ELSE 0 END) as round_success,
                SUM(CASE WHEN se.morning_class = 1 THEN 1 ELSE 0 END) as morning_class_success,
                SUM(CASE WHEN se.mangala_aarti = 1 THEN 1 ELSE 0 END) as mangala_arti_success,
                SUM(CASE WHEN se.cleanliness = 1 THEN 1 ELSE 0 END) as clean_success,
                SUM(CASE WHEN se.sleep_time <= '21:30' THEN 1 ELSE 0 END) as sleep_success
            FROM users u
            LEFT JOIN sadhana_entries se ON u.id = se.user_id 
                AND se.entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            WHERE u.user_role = 'devotee'
        `;
        
        let params = [days];
        
        // 🟢 PROPER VOICE FILTERING:
        // If voice is 'All', get ALL users (no voice filter)
        // If voice is specific, filter by that voice
        if (voice && voice !== 'All') {
            query += ` AND u.voice_name = ?`;
            params.push(voice);
        }
        
        // Add group filter if specified
        if (group && group !== 'All') {
            query += ` AND u.user_group = ?`;
            params.push(group);
        }
        
        query += ` GROUP BY u.id ORDER BY u.user_group, u.name`;
        
        const [rows] = await pool.query(query, params);
        
        // Get latest entry for each user
        const result = await Promise.all(rows.map(async (user) => {
            const [latest] = await pool.query(
                `SELECT * FROM sadhana_entries 
                 WHERE user_id = ? AND entry_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 ORDER BY entry_date DESC LIMIT 1`,
                [user.id, days]
            );
            
            const latestEntry = latest[0] || {};
            
            return {
                name: user.name,
                voice: user.voice,
                group: user.group,
                wakeup_time: latestEntry.wakeup_time,
                sleep_time: latestEntry.sleep_time,
                chanting_end_time: latestEntry.chanting_end_time,
                temp_hall_rech: latestEntry.temp_hall_rech,
                hearing_minutes: latestEntry.hearing_minutes,
                reading_minutes: latestEntry.reading_minutes,
                study_minutes: latestEntry.study_minutes,
                morning_class: latestEntry.morning_class,
                mangala_aarti: latestEntry.mangala_aarti,
                cleanliness: latestEntry.cleanliness,
                rounds: latestEntry.rounds,
                day_rest_minutes: latestEntry.day_rest_minutes,
                wakeSuccess: user.wake_success || 0,
                templeSuccess: user.temple_success || 0,
                roundSuccess: user.round_success || 0,
                morningClassSuccess: user.morning_class_success || 0,
                mangalaArtiSuccess: user.mangala_arti_success || 0,
                cleanSuccess: user.clean_success || 0,
                sleepSuccess: user.sleep_success || 0,
                totalRounds: user.total_rounds || 0,
                totalHearing: user.total_hearing || 0,
                totalReading: user.total_reading || 0,
                totalStudy: user.total_study || 0,
                totalRest: user.total_rest || 0,
                total_soul_marks: user.total_soul_marks || 0,
                total_body_marks: user.total_body_marks || 0,
                entry_count: user.entry_count || 0
            };
        }));
        
        res.json(result);
        
    } catch (e) { 
        console.error('Dashboard error:', e);
        res.status(500).json({ error: 'Dashboard failed: ' + e.message }); 
    }
});

// ============================================
// VOICES ENDPOINT
// ============================================
app.get('/api/voices', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DISTINCT voice_name FROM users WHERE voice_name IS NOT NULL AND voice_name != "" ORDER BY voice_name'
        );
        const voices = rows.map(r => r.voice_name);
        res.json(voices);
    } catch (error) {
        console.error('Voices error:', error);
        res.json([]);
    }
});

// ============================================
// GROUPS ENDPOINT
// ============================================
app.get('/api/groups', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DISTINCT user_group FROM users WHERE user_group IS NOT NULL AND user_group != "" ORDER BY user_group'
        );
        const groups = rows.map(r => r.user_group);
        
        // If no groups, return defaults
        if (groups.length === 0) {
            return res.json(['Yudhisthir', 'Bheem', 'Nakul', 'Sahdev']);
        }
        
        res.json(groups);
    } catch (error) {
        console.error('Groups error:', error);
        res.json(['Yudhisthir', 'Bheem', 'Nakul', 'Sahdev']);
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
// GET /api/leaderboard/months - Get available months
// ============================================
app.get('/api/leaderboard/months', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT 
                DATE_FORMAT(entry_date, '%Y-%m') as month
            FROM sadhana_entries 
            ORDER BY month DESC
            LIMIT 12
        `);
        
        const months = rows.map(r => r.month);
        
        // Always include current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        if (!months.includes(currentMonth)) {
            months.unshift(currentMonth);
        }
        
        res.json(months);
        
    } catch (error) {
        console.error('Error fetching months:', error);
        // Return default months
        const months = ['current'];
        const now = new Date();
        for (let i = 1; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.toISOString().slice(0, 7));
        }
        res.json(months);
    }
});
// ============================================
// FIXED: Leaderboard endpoint with proper calculations
// ============================================
// ============================================
// FIXED: Leaderboard endpoint with proper voice filtering
// ============================================
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { month, group, voice } = req.query;
        const currentUserId = req.user.id;
        const userRole = req.user.role;
        
        // Calculate date range
        let startDate, endDate;
        const today = new Date();
        
        if (month === 'current' || !month) {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        } else {
            const [year, monthNum] = month.split('-');
            startDate = `${year}-${monthNum}-01`;
            const lastDay = new Date(year, monthNum, 0).getDate();
            endDate = `${year}-${monthNum}-${lastDay}`;
        }
        
        console.log(`📊 Leaderboard request: user=${req.user.id}, role=${userRole}, month=${month}, voice=${voice}, from=${startDate} to=${endDate}`);
        
        // Determine voice filter based on role and query
        let voiceFilter;
        let userQuery;
        let userParams = [];
        
        if (userRole === 'devotee') {
            // Devotee sees only their voice
            const [userInfo] = await pool.query('SELECT voice_name FROM users WHERE id = ?', [currentUserId]);
            voiceFilter = userInfo[0]?.voice_name;
            userQuery = `
                SELECT id, name, user_group, voice_name 
                FROM users 
                WHERE user_role = 'devotee' AND voice_name = ?
            `;
            userParams = [voiceFilter];
        } else {
            // Admin/developer - voice filtering based on query
            userQuery = `
                SELECT id, name, user_group, voice_name 
                FROM users 
                WHERE user_role = 'devotee'
            `;
            
            // 🟢 PROPER VOICE FILTERING:
            // If voice is 'All', get ALL users (no filter)
            // If voice is specific, filter by that voice
            if (voice && voice !== 'All') {
                userQuery += ` AND voice_name = ?`;
                userParams.push(voice);
            }
        }
        
        // Add group filter if specified
        if (group && group !== 'All') {
            userQuery += ` AND user_group = ?`;
            userParams.push(group);
        }
        
        userQuery += ` ORDER BY name ASC`;
        
        const [allUsers] = await pool.query(userQuery, userParams);
        
        if (allUsers.length === 0) {
            return res.json([]);
        }
        
        // Calculate total days in period
        const totalDays = month === 'current' ? new Date().getDate() : 
                         new Date(endDate).getDate();
        
        // Get data for each user
        const leaderboardData = await Promise.all(allUsers.map(async (user) => {
            const [records] = await pool.query(
                `SELECT * FROM sadhana_entries 
                 WHERE user_id = ? AND entry_date BETWEEN ? AND ?`,
                [user.id, startDate, endDate]
            );
            
            const totalSoulMarks = records.reduce((s, r) => s + (r.soul_marks || 0), 0);
            const totalBodyMarks = records.reduce((s, r) => s + (r.body_marks || 0), 0);
            const entryCount = records.length;
            
            // Calculate percentages based on TOTAL possible for the period
            const soulPercentage = totalDays > 0 ? 
                Math.round((totalSoulMarks / (50 * totalDays)) * 100) : 0;
            const bodyPercentage = totalDays > 0 ? 
                Math.round((totalBodyMarks / (75 * totalDays)) * 100) : 0;
            
            return {
                id: user.id,
                name: user.name,
                group: user.user_group,
                voice: user.voice_name,
                total_soul_marks: totalSoulMarks,
                total_body_marks: totalBodyMarks,
                entry_count: entryCount,
                soulPercentage: soulPercentage,
                bodyPercentage: bodyPercentage,
                totalDays: totalDays
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


//=====================================
// Analytics reports
//=====================================
// Add this endpoint to your server.js
// ============================================
// Analytics reports - Already has proper voice filtering
// ============================================
app.get('/api/reports/group', authenticateToken, async (req, res) => {
    try {
        const { voice, start, end } = req.query;
        
        console.log(`📊 Group report: voice=${voice}, from=${start} to=${end}`);
        
        let query;
        let params;
        
        // 🟢 PROPER VOICE FILTERING:
        // If voice is 'All', get ALL users
        // If voice is specific, filter by that voice
        if (voice === 'All') {
            query = `
                SELECT 
                    u.id,
                    u.name,
                    u.user_group,
                    u.voice_name,
                    COUNT(se.id) as entry_count,
                    COALESCE(SUM(se.soul_marks), 0) as total_soul_marks,
                    COALESCE(SUM(se.body_marks), 0) as total_body_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.sleep_time <= '21:30' THEN 25
                        WHEN se.sleep_time <= '22:00' THEN 20
                        WHEN se.sleep_time <= '22:30' THEN 15
                        WHEN se.sleep_time <= '23:00' THEN 10
                        WHEN se.sleep_time <= '23:30' THEN 5
                        ELSE 0
                    END), 0) as total_sleep_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.wakeup_time <= '04:30' THEN 25
                        WHEN se.wakeup_time <= '05:00' THEN 20
                        WHEN se.wakeup_time <= '05:30' THEN 15
                        WHEN se.wakeup_time <= '06:00' THEN 10
                        WHEN se.wakeup_time <= '06:30' THEN 5
                        ELSE 0
                    END), 0) as total_wakeup_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.day_rest_minutes <= 30 THEN 25
                        WHEN se.day_rest_minutes <= 45 THEN 20
                        WHEN se.day_rest_minutes <= 60 THEN 15
                        WHEN se.day_rest_minutes <= 75 THEN 10
                        WHEN se.day_rest_minutes <= 90 THEN 5
                        ELSE 0
                    END), 0) as total_rest_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.chanting_end_time <= '06:45' THEN 25
                        WHEN se.chanting_end_time <= '09:00' THEN 20
                        WHEN se.chanting_end_time <= '13:00' THEN 15
                        WHEN se.chanting_end_time <= '16:00' THEN 10
                        WHEN se.chanting_end_time <= '20:00' THEN 5
                        ELSE 0
                    END), 0) as total_chanting_marks,
                    COALESCE(SUM(
                        (CASE WHEN se.hearing_minutes > 0 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.reading_minutes > 0 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.morning_class = 1 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.mangala_aarti = 1 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.cleanliness = 1 THEN 5 ELSE 0 END)
                    ), 0) as total_soul_activities_marks
                FROM users u
                LEFT JOIN sadhana_entries se ON u.id = se.user_id 
                    AND se.entry_date BETWEEN ? AND ?
                WHERE u.user_role = 'devotee'
                GROUP BY u.id, u.name, u.user_group, u.voice_name
                ORDER BY u.voice_name, u.user_group, u.name
            `;
            params = [start, end];
        } else {
            query = `
                SELECT 
                    u.id,
                    u.name,
                    u.user_group,
                    u.voice_name,
                    COUNT(se.id) as entry_count,
                    COALESCE(SUM(se.soul_marks), 0) as total_soul_marks,
                    COALESCE(SUM(se.body_marks), 0) as total_body_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.sleep_time <= '21:30' THEN 25
                        WHEN se.sleep_time <= '22:00' THEN 20
                        WHEN se.sleep_time <= '22:30' THEN 15
                        WHEN se.sleep_time <= '23:00' THEN 10
                        WHEN se.sleep_time <= '23:30' THEN 5
                        ELSE 0
                    END), 0) as total_sleep_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.wakeup_time <= '04:30' THEN 25
                        WHEN se.wakeup_time <= '05:00' THEN 20
                        WHEN se.wakeup_time <= '05:30' THEN 15
                        WHEN se.wakeup_time <= '06:00' THEN 10
                        WHEN se.wakeup_time <= '06:30' THEN 5
                        ELSE 0
                    END), 0) as total_wakeup_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.day_rest_minutes <= 30 THEN 25
                        WHEN se.day_rest_minutes <= 45 THEN 20
                        WHEN se.day_rest_minutes <= 60 THEN 15
                        WHEN se.day_rest_minutes <= 75 THEN 10
                        WHEN se.day_rest_minutes <= 90 THEN 5
                        ELSE 0
                    END), 0) as total_rest_marks,
                    COALESCE(SUM(CASE 
                        WHEN se.chanting_end_time <= '06:45' THEN 25
                        WHEN se.chanting_end_time <= '09:00' THEN 20
                        WHEN se.chanting_end_time <= '13:00' THEN 15
                        WHEN se.chanting_end_time <= '16:00' THEN 10
                        WHEN se.chanting_end_time <= '20:00' THEN 5
                        ELSE 0
                    END), 0) as total_chanting_marks,
                    COALESCE(SUM(
                        (CASE WHEN se.hearing_minutes > 0 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.reading_minutes > 0 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.morning_class = 1 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.mangala_aarti = 1 THEN 5 ELSE 0 END) +
                        (CASE WHEN se.cleanliness = 1 THEN 5 ELSE 0 END)
                    ), 0) as total_soul_activities_marks
                FROM users u
                LEFT JOIN sadhana_entries se ON u.id = se.user_id 
                    AND se.entry_date BETWEEN ? AND ?
                WHERE u.voice_name = ? AND u.user_role = 'devotee'
                GROUP BY u.id, u.name, u.user_group, u.voice_name
                ORDER BY u.user_group, u.name
            `;
            params = [start, end, voice];
        }
        
        const [rows] = await pool.query(query, params);
        console.log(`✅ Found ${rows.length} users for voice=${voice}`);
        res.json(rows);
        
    } catch (error) {
        console.error('❌ Group report error:', error);
        res.status(500).json({ error: error.message });
    }
});
/*
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
});*/
// ============================================
// SERVER START - SIMPLE & SAFE (WORKS EVERYWHERE)
// ============================================
const PORT = process.env.PORT || 8080;

// ✅ ADD THIS EXPORT FOR TESTING (RIGHT HERE)
// This allows Jest to import the app without starting the server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Sadhana Tracker Backend Ready on port ${PORT}`);
        console.log(`🌍 Listening on 0.0.0.0:${PORT} (accessible locally & publicly)`);
        console.log(`📝 Local URL: http://localhost:${PORT}`);
        console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);

        if (process.env.NODE_ENV === 'production') {
            console.log(`🌐 Public URL: https://sadhana-tracker-production.up.railway.app:${PORT}`);
        }
    });
}
// Only close connections in test environment
if (process.env.NODE_ENV === 'test') {
  // Ensure pool is closed when tests finish
  process.on('exit', async () => {
    if (pool) {
      await pool.end();
      console.log('✅ Database pool closed for tests');
    }
  });
}
// Export pool for test cleanup
if (process.env.NODE_ENV === 'test') {
  module.exports = { app, pool };
} else {
  module.exports = app;
}
// ✅ ADD THIS EXPORT (AT THE VERY END OF FILE)
module.exports = app;