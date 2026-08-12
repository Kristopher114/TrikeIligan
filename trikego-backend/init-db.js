const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTables = async () => {
  const sql = `
    DROP TABLE IF EXISTS Rides, Passengers, Drivers, Admins, Users CASCADE;

    -- 1. Core Users Table (Handles all shared auth and profile data)
    CREATE TABLE IF NOT EXISTS Users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Passengers Table (For passenger-specific data only)
    CREATE TABLE IF NOT EXISTS Passengers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL,
        user_id UUID UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
        rating DECIMAL(3, 2) DEFAULT 5.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Drivers Table (For driver-specific data only)
    CREATE TABLE IF NOT EXISTS Drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
        license_number VARCHAR(50),
        vehicle_plate VARCHAR(20),
        vehicle_model VARCHAR(50),
        rating DECIMAL(3, 2) DEFAULT 5.00,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Admins Table (For admin-specific data only)
    CREATE TABLE IF NOT EXISTS Admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
        permissions_level INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Rides Table
    CREATE TABLE IF NOT EXISTS Rides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        passenger_id UUID REFERENCES Users(id),
        driver_id UUID REFERENCES Users(id),
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED')),
        pickup_address TEXT NOT NULL,
        dropoff_address TEXT NOT NULL,
        base_fare DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );
  `;

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Creating tables...');
    await client.query(sql);

    console.log('Tables created successfully!');
    client.release();
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    // End the pool so the script can exit cleanly
    await pool.end();
  }
};

createTables();
