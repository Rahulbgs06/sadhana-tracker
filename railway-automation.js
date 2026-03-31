#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    projectName: 'prolific-serenity',
    backupDir: './railway-backups',
    dbHost: '',
    dbUser: '',
    dbPassword: '',
    dbName: '',
    dbPort: '',
};

// Create backup directory
if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function runCommand(command, silent = false) {
    try {
        if (!silent) console.log(`\n🔧 Executing: ${command}`);
        const output = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
        return output;
    } catch (error) {
        console.error(`❌ Command failed: ${command}`);
        console.error(error.message);
        return null;
    }
}

function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// ============================================
// 1. GET RAILWAY DATABASE CREDENTIALS
// ============================================
function getRailwayDBCredentials() {
    console.log('\n📡 Fetching Railway database credentials...');
    
    try {
        // Try to get from railway CLI
        const output = runCommand('railway status --json', true);
        if (output) {
            const data = JSON.parse(output);
            if (data && data.services) {
                const mysqlService = data.services.find(s => s.type === 'mysql');
                if (mysqlService && mysqlService.domain) {
                    // Parse connection string
                    const connStr = mysqlService.domain;
                    // Format: mysql://user:password@host:port/database
                    const match = connStr.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
                    if (match) {
                        CONFIG.dbUser = match[1];
                        CONFIG.dbPassword = match[2];
                        CONFIG.dbHost = match[3];
                        CONFIG.dbPort = match[4];
                        CONFIG.dbName = match[5];
                        console.log('✅ Database credentials retrieved from Railway');
                        return true;
                    }
                }
            }
        }
    } catch (error) {
        console.log('⚠️ Could not auto-detect credentials');
    }
    
    // If auto-detection fails, check environment variables
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
        CONFIG.dbHost = process.env.DB_HOST;
        CONFIG.dbUser = process.env.DB_USER;
        CONFIG.dbPassword = process.env.DB_PASSWORD;
        CONFIG.dbName = process.env.DB_NAME || 'railway';
        CONFIG.dbPort = process.env.DB_PORT || '3306';
        console.log('✅ Using credentials from environment variables');
        return true;
    }
    
    // Ask user for credentials
    console.log('\n⚠️ Please enter your Railway MySQL credentials manually:');
    console.log('   Example:');
    console.log('   Host: interchange.proxy.rlwy.net');
    console.log('   Port: 42649');
    console.log('   User: root');
    console.log('   Password: your-password');
    console.log('   Database: railway\n');
    
    return false;
}

// ============================================
// 2. BACKUP DATABASE
// ============================================
async function backupDatabase() {
    console.log('\n💾 BACKING UP DATABASE...');
    
    // Get credentials if not set
    if (!CONFIG.dbHost) {
        const hasCreds = getRailwayDBCredentials();
        if (!hasCreds) {
            console.log('\n❌ Please set credentials using environment variables:');
            console.log('   export DB_HOST=interchange.proxy.rlwy.net');
            console.log('   export DB_USER=root');
            console.log('   export DB_PASSWORD=your-password');
            console.log('   export DB_NAME=railway');
            console.log('   export DB_PORT=42649');
            console.log('\n   Or run: source .env');
            return null;
        }
    }
    
    const timestamp = getTimestamp();
    const backupFile = path.join(CONFIG.backupDir, `backup_${timestamp}.sql`);
    
    // Test connection first
    const testCommand = `mysql -h ${CONFIG.dbHost} -u ${CONFIG.dbUser} -p${CONFIG.dbPassword} -P ${CONFIG.dbPort} -e "SELECT 1"`;
    try {
        execSync(testCommand, { stdio: 'pipe' });
        console.log('✅ Database connection successful');
    } catch (error) {
        console.error('❌ Cannot connect to database. Please check credentials.');
        console.error(`   Host: ${CONFIG.dbHost}:${CONFIG.dbPort}`);
        console.error(`   User: ${CONFIG.dbUser}`);
        return null;
    }
    
    const command = `mysqldump -h ${CONFIG.dbHost} -u ${CONFIG.dbUser} -p${CONFIG.dbPassword} -P ${CONFIG.dbPort} --single-transaction --routines --triggers ${CONFIG.dbName} > "${backupFile}"`;
    
    try {
        execSync(command, { stdio: 'pipe' });
        
        // Check if backup was created
        if (fs.existsSync(backupFile)) {
            const stats = fs.statSync(backupFile);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ Backup created: ${backupFile} (${sizeKB} KB)`);
            
            // Save metadata
            const metadata = {
                timestamp,
                backupFile,
                dbHost: CONFIG.dbHost,
                dbName: CONFIG.dbName,
                sizeKB,
                createdAt: new Date().toISOString()
            };
            fs.writeFileSync(
                path.join(CONFIG.backupDir, `metadata_${timestamp}.json`),
                JSON.stringify(metadata, null, 2)
            );
            
            return backupFile;
        }
        return null;
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        return null;
    }
}

// ============================================
// 3. DELETE PROJECT (Stop to save credits)
// ============================================
async function deleteProject() {
    console.log('\n🗑️ DELETING RAILWAY PROJECT...');
    console.log('⚠️ WARNING: This will delete your entire project!');
    console.log('✅ Your data is backed up, so you can restore later.\n');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
        rl.question('Type "DELETE" to confirm deletion: ', resolve);
    });
    rl.close();
    
    if (answer !== 'DELETE') {
        console.log('❌ Deletion cancelled.');
        return false;
    }
    
    try {
        // Try different deletion methods
        let deleted = false;
        
        // Method 1: railway down
        try {
            runCommand('railway down --yes', true);
            deleted = true;
        } catch (e) {
            // Method 2: railway delete
            try {
                runCommand('railway delete --yes', true);
                deleted = true;
            } catch (e2) {
                console.log('⚠️ Could not delete via CLI');
            }
        }
        
        if (deleted) {
            console.log('✅ Project deleted successfully');
            console.log('💾 Credits saved! Your balance will stop decreasing.');
            return true;
        } else {
            throw new Error('CLI deletion failed');
        }
    } catch (error) {
        console.error('❌ Deletion failed:', error.message);
        console.log('\n⚠️ Please delete manually from Railway dashboard:');
        console.log('   1. Go to https://railway.app');
        console.log('   2. Click on your project');
        console.log('   3. Settings → Danger Zone → Delete Project');
        console.log('\n   Press Enter after manual deletion...');
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        await new Promise(resolve => rl.question('', resolve));
        rl.close();
        
        return true; // Assume user deleted manually
    }
}

// ============================================
// 4. LIST BACKUPS
// ============================================
function listBackups() {
    console.log('\n📋 AVAILABLE BACKUPS:');
    
    if (!fs.existsSync(CONFIG.backupDir)) {
        console.log('   No backups directory found.');
        return [];
    }
    
    const files = fs.readdirSync(CONFIG.backupDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .reverse();
    
    if (files.length === 0) {
        console.log('   No backups found.');
        return [];
    }
    
    files.forEach((file, index) => {
        const stats = fs.statSync(path.join(CONFIG.backupDir, file));
        const sizeKB = (stats.size / 1024).toFixed(2);
        const modified = stats.mtime.toLocaleString();
        console.log(`   ${index + 1}. ${file} (${sizeKB} KB) - ${modified}`);
    });
    
    return files;
}

// ============================================
// 5. RESTORE DATABASE
// ============================================
async function restoreDatabase(backupFile = null) {
    console.log('\n🔄 RESTORING DATABASE...');
    
    // Get credentials if not set
    if (!CONFIG.dbHost) {
        const hasCreds = getRailwayDBCredentials();
        if (!hasCreds) {
            console.log('\n❌ Please set credentials first');
            return false;
        }
    }
    
    // If no backup specified, show list
    if (!backupFile) {
        const files = listBackups();
        if (files.length === 0) {
            console.log('❌ No backups available to restore.');
            return false;
        }
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
            rl.question('\nEnter backup number (or "latest"): ', resolve);
        });
        rl.close();
        
        if (answer === 'latest') {
            backupFile = files[0];
        } else {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < files.length) {
                backupFile = files[index];
            } else {
                console.log('❌ Invalid selection.');
                return false;
            }
        }
    }
    
    const backupPath = path.join(CONFIG.backupDir, backupFile);
    if (!fs.existsSync(backupPath)) {
        console.log(`❌ Backup file not found: ${backupPath}`);
        return false;
    }
    
    console.log(`📂 Restoring from: ${backupFile}`);
    
    const command = `mysql -h ${CONFIG.dbHost} -u ${CONFIG.dbUser} -p${CONFIG.dbPassword} -P ${CONFIG.dbPort} ${CONFIG.dbName} < "${backupPath}"`;
    
    try {
        execSync(command, { stdio: 'pipe' });
        console.log('✅ Database restored successfully!');
        return true;
    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        return false;
    }
}

// ============================================
// 6. DEPLOY NEW PROJECT
// ============================================
async function deployProject() {
    console.log('\n🚀 DEPLOYING NEW PROJECT...');
    
    // Check if we're in a git repo
    try {
        execSync('git status', { stdio: 'pipe' });
    } catch {
        console.log('⚠️ Not in a git repository.');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const answer = await new Promise(resolve => {
            rl.question('Continue anyway? (yes/no): ', resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== 'yes') {
            return false;
        }
    }
    
    try {
        // Fix: Use 'railway up' without --yes flag
        console.log('📦 Deploying to Railway...');
        execSync('railway up', { stdio: 'inherit' });
        console.log('✅ Project deployed!');
        
        // Wait for services to start
        console.log('⏳ Waiting for services to start (30 seconds)...');
        await wait(30);
        
        // Refresh credentials
        getRailwayDBCredentials();
        
        return true;
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.log('\n⚠️ Please deploy manually:');
        console.log('   1. Run: railway login');
        console.log('   2. Run: railway up');
        console.log('   3. Follow the prompts\n');
        return false;
    }
}

// ============================================
// 7. FULL CYCLE: Backup → Delete → Deploy → Restore
// ============================================
async function fullCycle() {
    console.log('\n🔄 STARTING FULL CYCLE: Backup → Delete → Deploy → Restore\n');
    console.log('⚠️ IMPORTANT: This will:');
    console.log('   1. Backup your database');
    console.log('   2. Delete your Railway project (saves credits)');
    console.log('   3. Deploy a new project');
    console.log('   4. Restore your data\n');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
        rl.question('Type "FULL CYCLE" to confirm: ', resolve);
    });
    rl.close();
    
    if (answer !== 'FULL CYCLE') {
        console.log('❌ Cycle cancelled.');
        return;
    }
    
    // Step 1: Backup
    console.log('\n📦 STEP 1/4: Creating backup...');
    const backupFile = await backupDatabase();
    if (!backupFile) {
        console.log('❌ Backup failed. Cycle stopped.');
        return;
    }
    
    // Step 2: Delete
    console.log('\n📦 STEP 2/4: Deleting project...');
    const deleted = await deleteProject();
    if (!deleted) {
        console.log('❌ Deletion failed. Cycle stopped.');
        return;
    }
    
    // Step 3: Deploy
    console.log('\n📦 STEP 3/4: Deploying new project...');
    console.log('⏳ Waiting 10 seconds before deploying...');
    await wait(10);
    
    const deployed = await deployProject();
    if (!deployed) {
        console.log('❌ Deployment failed. Your backup is safe at:', backupFile);
        return;
    }
    
    // Step 4: Restore
    console.log('\n📦 STEP 4/4: Restoring data...');
    console.log('⏳ Waiting 20 seconds for services to stabilize...');
    await wait(20);
    
    // Refresh credentials for new project
    getRailwayDBCredentials();
    await wait(5);
    
    const restored = await restoreDatabase(path.basename(backupFile));
    
    if (restored) {
        console.log('\n✅ FULL CYCLE COMPLETE!');
        console.log('🎉 Your project is back online with all data restored.');
        console.log(`💾 Backup saved at: ${backupFile}`);
    } else {
        console.log('\n⚠️ Full cycle completed but restore failed.');
        console.log(`💾 Your backup is safe at: ${backupFile}`);
        console.log('You can restore manually using option 4 from the menu.');
    }
}

// ============================================
// 8. INTERACTIVE MENU
// ============================================
async function showMenu() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║     RAILWAY AUTOMATION - Sadhana Tracker            ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('\n1. Backup Database');
    console.log('2. Delete Project (Stop to save credits)');
    console.log('3. Deploy New Project');
    console.log('4. Restore Database');
    console.log('5. List Backups');
    console.log('6. FULL CYCLE (Backup → Delete → Deploy → Restore)');
    console.log('7. Exit');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const choice = await new Promise(resolve => {
        rl.question('\nChoose option (1-7): ', resolve);
    });
    rl.close();
    
    switch (choice) {
        case '1':
            await backupDatabase();
            break;
        case '2':
            await deleteProject();
            break;
        case '3':
            await deployProject();
            break;
        case '4':
            await restoreDatabase();
            break;
        case '5':
            listBackups();
            break;
        case '6':
            await fullCycle();
            break;
        case '7':
            console.log('👋 Goodbye!');
            process.exit(0);
        default:
            console.log('❌ Invalid option');
    }
    
    // Show menu again after action
    if (choice !== '7') {
        setTimeout(() => {
            showMenu().catch(console.error);
        }, 2000);
    }
}

// ============================================
// MAIN - Check for command line arguments
// ============================================
async function main() {
    const args = process.argv.slice(2);
    
    // Set credentials from environment if available
    if (process.env.DB_HOST) {
        CONFIG.dbHost = process.env.DB_HOST;
        CONFIG.dbUser = process.env.DB_USER;
        CONFIG.dbPassword = process.env.DB_PASSWORD;
        CONFIG.dbName = process.env.DB_NAME || 'railway';
        CONFIG.dbPort = process.env.DB_PORT || '3306';
    }
    
    if (args[0] === 'backup') {
        await backupDatabase();
    } else if (args[0] === 'delete') {
        await deleteProject();
    } else if (args[0] === 'deploy') {
        await deployProject();
    } else if (args[0] === 'restore') {
        await restoreDatabase(args[1]);
    } else if (args[0] === 'list') {
        listBackups();
    } else if (args[0] === 'cycle') {
        await fullCycle();
    } else {
        await showMenu();
    }
}

// Run the script
main().catch(console.error);