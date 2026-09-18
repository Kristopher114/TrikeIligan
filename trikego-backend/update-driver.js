const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const updateDriver = async () => {
  const client = await pool.connect();
  try {
    console.log('Updating mock driver to SINGLE...');
    await client.query(`
      UPDATE Drivers 
      SET vehicle_type = 'SINGLE'
      WHERE user_id = (SELECT id FROM Users WHERE email = 'driver@example.com')
    `);
    console.log('Driver updated successfully!');
  } catch (err) {
    console.error('Error updating driver:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

updateDriver();
