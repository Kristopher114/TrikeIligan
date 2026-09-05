const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkData() {
  try {
    const client = await pool.connect();

    console.log("=== USERS TABLE ===");
    const usersResult = await client.query('SELECT id, full_name, email, phone_number, role FROM Users');
    console.table(usersResult.rows);

    console.log("\n=== PASSENGERS TABLE ===");
    const passengersResult = await client.query('SELECT * FROM Passengers');
    console.table(passengersResult.rows);

    console.log("\n=== DRIVERS TABLE ===");
    const driverResult = await client.query(`
      SELECT d.license_number,d.vehicle_plate,d.vehicle_model,d.rating, u.full_name, u.email 
      FROM Drivers d
      JOIN Users u ON d.user_id = u.id
    `);
    console.table(driverResult.rows);

    client.release();
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    await pool.end();
  }
}

checkData();
