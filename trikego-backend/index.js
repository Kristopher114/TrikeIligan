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

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
