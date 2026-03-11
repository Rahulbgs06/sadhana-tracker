const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);

    // Production-ready SQL
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    console.log('\nSQL to insert admin user:');
    console.log(`INSERT INTO users (name, email, password_hash, role, group_name) 
    VALUES ('Admin', 'admin@sadhna.com', '${hash}', 'developer', 'Sahdev')
    ON DUPLICATE KEY UPDATE email=email;`);

    // ====== LOCAL TESTING (uncomment for local use only) ======
    /*
    const localPassword = 'test123';
    const localHash = await bcrypt.hash(localPassword, 10);
    console.log('Local Test Password:', localPassword);
    console.log('Local Test Hash:', localHash);
    */
    // ===========================================================
}

generateHash();