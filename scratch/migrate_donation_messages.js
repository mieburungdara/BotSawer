const db = require('../src/services/database');

async function migrate() {
    console.log("Adding message column to transactions table...");
    try {
        const hasColumn = await db.schema.hasColumn('transactions', 'message');
        if (!hasColumn) {
            await db.schema.alterTable('transactions', (table) => {
                table.string('message', 255).nullable();
            });
            console.log("Column 'message' added successfully.");
        } else {
            console.log("Column 'message' already exists.");
        }
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrate();
