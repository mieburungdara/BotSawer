const db = require('./src/services/database');

async function checkSchema() {
    try {
        const columns = await db.raw("PRAGMA table_info(users)");
        console.log("Users Table Columns:");
        columns.forEach(col => {
            console.log(`- ${col.name} (${col.type})`);
        });
        
        const hasPrivate = columns.find(c => c.name === 'is_private');
        if (!hasPrivate) {
            console.log("\nColumn 'is_private' NOT found. Creating migration...");
            await db.raw("ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0");
            console.log("Column 'is_private' added successfully.");
        } else {
            console.log("\nColumn 'is_private' already exists.");
        }
    } catch (err) {
        console.error("Error checking schema:", err);
    } finally {
        process.exit();
    }
}

checkSchema();
