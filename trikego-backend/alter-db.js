const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const alterDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Altering database...');
    await client.query(`
      ALTER TABLE Drivers 
      ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'TRICYCLE' CHECK (vehicle_type IN ('SINGLE', 'TRICYCLE'));
    `);
    console.log('Database altered successfully!');
  } catch (err) {
    console.error('Error altering database:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

alterDb();
