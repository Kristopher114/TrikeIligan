const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const seedDriver = async () => {
  const client = await pool.connect();
  try {
    console.log('Seeding mock driver...');
    await client.query('BEGIN');

    const fullName = 'Mock Driver';
    const email = 'driver@example.com';
    const phoneNumber = '09123456789';
    const password = 'password123';
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into Users table as DRIVER
    const insertUserQuery = `
      INSERT INTO Users (full_name, phone_number, email, password_hash, role)
      VALUES ($1, $2, $3, $4, 'DRIVER')
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `;
    const userResult = await client.query(insertUserQuery, [fullName, phoneNumber, email, passwordHash]);
    
    if (userResult.rows.length === 0) {
      console.log('Mock driver already exists!');
      await client.query('ROLLBACK');
      return;
    }
    
    const userId = userResult.rows[0].id;

    // Insert into Drivers table
    const insertDriverQuery = `
      INSERT INTO Drivers (user_id, license_number, vehicle_plate, vehicle_model, rating, is_active)
      VALUES ($1, 'DL-123456', 'XYZ-987', 'Kawasaki Barako 175', 5.0, true);
    `;
    await client.query(insertDriverQuery, [userId]);

    await client.query('COMMIT');
    console.log('Successfully added Mock Driver!');
    console.log('Email: driver@example.com');
    console.log('Password: password123');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding driver:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

seedDriver();
