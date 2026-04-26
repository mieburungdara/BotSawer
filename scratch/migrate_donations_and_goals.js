const db = require('../src/services/database');

async function migrate() {
    console.log("Starting migration: Donations & Goals...");
    try {
        // 1. Add message column to transactions
        const hasMsgColumn = await db.schema.hasColumn('transactions', 'message');
        if (!hasMsgColumn) {
            await db.schema.alterTable('transactions', (table) => {
                table.string('message', 255).nullable();
            });
            console.log("Column 'message' added to transactions.");
        }

        // 2. Add goal columns to users
        const hasGoalColumn = await db.schema.hasColumn('users', 'donation_goal');
        if (!hasGoalColumn) {
            await db.schema.alterTable('users', (table) => {
                table.decimal('donation_goal', 15, 2).defaultTo(0);
                table.string('donation_goal_title', 255).nullable();
                table.decimal('donation_goal_current', 15, 2).defaultTo(0);
            });
            console.log("Goal columns added to users.");
        }

        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrate();
