const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Successfully connected to Neon PostgreSQL database!');
    release();
  }
});

// Root Endpoint (For cron-job pings to keep the server awake)
app.get('/', (req, res) => {
  res.send('TrikeIligan API is awake and running!');
});

// Status Endpoint
app.get('/api/status', async (req, res) => {
  try {
    // Run a simple query to verify database connection
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'success',
      message: 'Database connection is active.',
      db_time: result.rows[0].current_time
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to the database.',
      error: err.message
    });
  }
});

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
  const { fullName, email, phoneNumber, password, username } = req.body;

  if (!fullName || !email || !phoneNumber || !password || !username) {
    return res.status(400).json({ status: 'error', message: 'All fields are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM Users WHERE email = $1 OR phone_number = $2', [email, phoneNumber]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ status: 'error', message: 'User with this email or phone number already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert into Users table
    const insertUserQuery = `
      INSERT INTO Users (full_name, phone_number, email, password_hash, role)
      VALUES ($1, $2, $3, $4, 'PASSENGER')
      RETURNING id;
    `;
    const userResult = await client.query(insertUserQuery, [fullName, phoneNumber, email, passwordHash]);
    const userId = userResult.rows[0].id;

    // Insert into Passengers table
    const insertPassengerQuery = `
      INSERT INTO Passengers (user_id, username)
      VALUES ($1, $2);
    `;
    await client.query(insertPassengerQuery, [userId, username]);

    await client.query('COMMIT');
    res.status(201).json({ status: 'success', message: 'User created successfully', userId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', error: error.message });
  } finally {
    client.release();
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password are required' });
  }

  const client = await pool.connect();
  try {
    const query = `
      SELECT u.id, u.full_name, u.password_hash, u.role, p.username 
      FROM Users u 
      JOIN Passengers p ON u.id = p.user_id 
      WHERE p.username = $1
    `;
    const result = await client.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
    }

    res.json({
      status: 'success',
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', error: error.message });
  } finally {
    client.release();
  }
});

// Driver Signup Endpoint
app.post('/api/driver-signup', async (req, res) => {
  const { fullName, email, phoneNumber, password, username } = req.body;

  if (!fullName || !email || !phoneNumber || !password || !username) {
    return res.status(400).json({ status: 'error', message: 'All fields are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM Users WHERE email = $1 OR phone_number = $2', [email, phoneNumber]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ status: 'error', message: 'User with this email or phone number already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert into Users table as DRIVER
    const insertUserQuery = `
      INSERT INTO Users (full_name, phone_number, email, password_hash, role)
      VALUES ($1, $2, $3, $4, 'DRIVER')
      RETURNING id;
    `;
    const userResult = await client.query(insertUserQuery, [fullName, phoneNumber, email, passwordHash]);
    const userId = userResult.rows[0].id;

    // Insert into Drivers table (we map username here for consistency or use license number later)
    // The current Drivers table does not have a username column, but let's insert the user_id.
    // Wait, the auth needs username. In `init-db.js`, Drivers has `user_id, license_number, vehicle_plate, vehicle_model, rating, is_active`.
    // So the driver logs in with email or phone number instead? Or we can check Users table directly for login?
    // To match passenger, let's just log in via email or phone, or add username to drivers. 
    // Wait, let's just add username to Drivers table or check Users table directly.
    // Actually, `Drivers` doesn't have a username column. Let's just create the driver and log them in via email/phone in the driver login.
    const insertDriverQuery = `
      INSERT INTO Drivers (user_id)
      VALUES ($1);
    `;
    await client.query(insertDriverQuery, [userId]);

    await client.query('COMMIT');
    res.status(201).json({ status: 'success', message: 'Driver created successfully', userId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Driver signup error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', error: error.message });
  } finally {
    client.release();
  }
});

// Driver Login Endpoint
app.post('/api/driver-login', async (req, res) => {
  const { username, password } = req.body; // In UI, they type email/phone in 'username' field

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Email/Phone and password are required' });
  }

  const client = await pool.connect();
  try {
    const query = `
      SELECT u.id, u.full_name, u.password_hash, u.role
      FROM Users u
      JOIN Drivers d ON u.id = d.user_id
      WHERE u.email = $1 OR u.phone_number = $1
    `;
    const result = await client.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials or not a driver' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    res.json({
      status: 'success',
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error', error: error.message });
  } finally {
    client.release();
  }
});
// Haversine distance calculation function
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

// Calculate Fare Endpoint
app.post('/api/calculate-fare', (req, res) => {
  const { pickupLat, pickupLon, dropLat, dropLon } = req.body;

  if (pickupLat == null || pickupLon == null || dropLat == null || dropLon == null) {
    return res.status(400).json({ status: 'error', message: 'Missing coordinates' });
  }

  try {
    const distanceKm = getDistanceFromLatLonInKm(pickupLat, pickupLon, dropLat, dropLon);

    // Pricing logic: Base fare ₱50 for first km, ₱5 for succeeding kms
    let fare = 50;
    if (distanceKm > 1) {
      fare += (distanceKm - 1) * 5;
    }

    // Estimate time (assume average city speed of 20km/h = 3 mins per km)
    // Add 2 mins base for traffic/boarding
    const estimatedTimeMins = Math.max(2, Math.round((distanceKm * 3) + 2));

    res.json({
      status: 'success',
      data: {
        distanceKm: distanceKm.toFixed(2),
        fare: Math.round(fare),
        estimatedTimeMins
      }
    });
  } catch (error) {
    console.error('Fare calculation error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to calculate fare' });
  }
});

// Fetch Ride History Endpoint
app.get('/api/rides/:userId', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
      SELECT r.id, r.pickup_address, r.dropoff_address, r.base_fare, r.created_at, r.status,
             u.full_name as driver_name
      FROM Rides r
      LEFT JOIN Users u ON r.driver_id = u.id
      WHERE r.passenger_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await client.query(query, [userId]);
    res.json({
      status: 'success',
      rides: result.rows
    });
  } catch (error) {
    console.error('Fetch rides error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch rides' });
  } finally {
    client.release();
  }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
