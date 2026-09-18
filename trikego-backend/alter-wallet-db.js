const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function alterDatabase() {
  const client = await pool.connect();
  try {
    console.log("Adding wallet_balance to Users table...");
    await client.query(`
      ALTER TABLE Users 
      ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0.00;
    `);

    console.log("Creating Transactions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS Transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES Users(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('TOPUP', 'FARE_PAYMENT', 'EARNING', 'WITHDRAWAL')),
          status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
          paymongo_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database altered successfully.");
  } catch (err) {
    console.error('Error altering database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

alterDatabase();
