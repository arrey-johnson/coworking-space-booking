const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to database. Running migration...');

    // Add isAvailable column if it doesn't exist
    await connection.execute(`
      ALTER TABLE workspaces 
      ADD COLUMN IF NOT EXISTS isAvailable BOOLEAN NOT NULL DEFAULT TRUE
    `);

    console.log('Migration completed successfully');
    await connection.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
