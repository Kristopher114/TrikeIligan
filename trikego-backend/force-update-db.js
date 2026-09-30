const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://trikego_db_user:E2a82h4F1Y2H1nIf3jV87h2oPqS8r4Z1@dpg-crd6scbtq21c73ebv03g-a.oregon-postgres.render.com/trikego_db',
  ssl: { rejectUnauthorized: false }
});

async function updateDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add columns if they don't exist
    await client.query(`
      ALTER TABLE Drivers 
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS license_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    // Create System_Config table
    await client.query(`
      CREATE TABLE IF NOT EXISTS System_Config (
        id SERIAL PRIMARY KEY,
        base_fare DECIMAL(10,2) DEFAULT 20.00,
        per_km_rate DECIMAL(10,2) DEFAULT 5.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default config if empty
    const checkConfig = await client.query(`SELECT COUNT(*) FROM System_Config`);
    if (parseInt(checkConfig.rows[0].count) === 0) {
      await client.query(`INSERT INTO System_Config (base_fare, per_km_rate) VALUES (20.00, 5.00)`);
    }

    await client.query('COMMIT');
    console.log("Database successfully updated.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Failed to update database:", error);
  } finally {
    client.release();
    pool.end();
  }
}

updateDB();
