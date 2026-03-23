const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupTestDatabase() {
  // ✅ Get the correct path to database folder
  // If script is in database folder, __dirname is correct
  const databaseDir = __dirname;
  
  console.log('📁 Database directory:', databaseDir);
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'testpass',
    multipleStatements: true
  });

  try {
    // Drop and create database
    await connection.query('DROP DATABASE IF EXISTS sadhana_tracker_test');
    await connection.query('CREATE DATABASE sadhana_tracker_test');
    await connection.query('USE sadhana_tracker_test');
    console.log('✅ Database created');

    // Run schema SQL
    const schemaPath = path.join(databaseDir, 'test-schema.sql');
    console.log('📄 Schema path:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSQL);
    console.log('✅ Schema created');

    // Run test data SQL
    const dataPath = path.join(databaseDir, 'test-data.sql');
    console.log('📄 Data path:', dataPath);
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found at: ${dataPath}`);
    }
    
    const dataSQL = fs.readFileSync(dataPath, 'utf8');
    await connection.query(dataSQL);
    console.log('✅ Test data inserted');

    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase().catch(console.error);
}

module.exports = setupTestDatabase;
