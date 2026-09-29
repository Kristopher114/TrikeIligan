require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const alterTables = async () => {
  const sql = `
    -- 1. Add Verification columns to Drivers table
    ALTER TABLE Drivers 
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    ADD COLUMN IF NOT EXISTS license_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

    -- 2. Create System_Config table
    CREATE TABLE IF NOT EXISTS System_Config (
        id INT PRIMARY KEY DEFAULT 1,
        base_fare DECIMAL(10, 2) DEFAULT 20.00,
        per_km_rate DECIMAL(10, 2) DEFAULT 5.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Insert default config if not exists
    INSERT INTO System_Config (id, base_fare, per_km_rate) 
    VALUES (1, 20.00, 5.00)
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Altering tables...');
    await client.query(sql);

    console.log('Database successfully updated!');
    client.release();
  } catch (err) {
    console.error('Error altering tables:', err);
  } finally {
    await pool.end();
  }
};

alterTables();
