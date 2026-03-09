const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Also show the SQL insert command
    console.log('\nSQL to insert admin user:');
    console.log(`INSERT INTO users (name, email, password_hash, role, group_name) 
    VALUES ('Admin', 'admin@sadhna.com', '${hash}', 'developer', 'Sahdev')
    ON DUPLICATE KEY UPDATE email=email;`);
}

generateHash();
