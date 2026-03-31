const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({
        message: "Debug Server Running",
        env: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            MYSQLHOST: process.env.MYSQLHOST || 'NOT SET',
            MYSQLPORT: process.env.MYSQLPORT || 'NOT SET',
            MYSQLUSER: process.env.MYSQLUSER || 'NOT SET',
            MYSQLDATABASE: process.env.MYSQLDATABASE || 'NOT SET',
            MYSQLPASSWORD: process.env.MYSQLPASSWORD ? '✅ SET' : 'NOT SET',
            DB_HOST: process.env.DB_HOST || 'NOT SET',
            DB_NAME: process.env.DB_NAME || 'NOT SET'
        }
    });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Debug server running on port ${PORT}`);
    console.log('📊 Environment variables:');
    console.log('MYSQLHOST:', process.env.MYSQLHOST || 'NOT SET');
    console.log('MYSQLUSER:', process.env.MYSQLUSER || 'NOT SET');
    console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE || 'NOT SET');
    console.log('MYSQLPASSWORD:', process.env.MYSQLPASSWORD ? '✅ SET' : 'NOT SET');
});
