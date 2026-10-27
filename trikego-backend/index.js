const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
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

// Ping Endpoint
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Pong!' });
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

// Admin Login Endpoint
app.post('/api/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }
  const client = await pool.connect();
  try {
    const query = `
      SELECT u.id, u.full_name, u.password_hash, u.role, u.email
      FROM Users u
      JOIN Admins a ON u.id = a.user_id
      WHERE u.email = $1
    `;
    const result = await client.query(query, [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials or not an admin' });
    }
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
    res.json({
      status: 'success',
      message: 'Login successful',
      token: 'mock-jwt-token-admin',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
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
      SELECT u.id, u.full_name, u.email, u.phone_number, u.profile_picture_url, u.password_hash, u.role, p.username 
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
        email: user.email,
        phoneNumber: user.phone_number,
        profileImage: user.profile_picture_url,
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
  const { fullName, email, phoneNumber, password, username, vehicleType, licensePhotoUrl } = req.body;

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
      INSERT INTO Drivers (user_id, vehicle_type, vehicle_model, license_photo_url)
      VALUES ($1, $2, $3, $4);
    `;
    const vType = vehicleType === 'SINGLE' ? 'SINGLE' : 'TRICYCLE';
    const defaultModel = req.body.vehicleModel || (vType === 'SINGLE' ? 'Single Motorcycle' : 'Kawasaki Barako 175');
    await client.query(insertDriverQuery, [userId, vType, defaultModel, licensePhotoUrl || null]);

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
      SELECT u.id, u.full_name, u.password_hash, u.role, d.vehicle_model, d.vehicle_type, d.rating, d.approval_status, d.rejection_reason
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
          role: user.role,
          vehicleModel: user.vehicle_model || (user.vehicle_type === 'SINGLE' ? 'Single Motorcycle' : 'Kawasaki Barako 175'),
          vehicleType: user.vehicle_type || 'TRICYCLE',
          rating: user.rating || 5.0,
          approvalStatus: user.approval_status,
          rejectionReason: user.rejection_reason
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

// GET Wallet Balance
app.get('/api/wallet/balance/:userId', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT wallet_balance FROM Users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', balance: result.rows[0].wallet_balance });
  } catch (error) {
    console.error('Fetch balance error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch balance' });
  } finally {
    client.release();
  }
});

// GET User Profile
app.get('/api/user-profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT u.id, u.full_name, u.email, u.phone_number, u.profile_picture_url, u.role,
             p.username,
             d.vehicle_model, d.vehicle_plate, d.license_number, d.vehicle_type, d.rating, d.approval_status
      FROM Users u
      LEFT JOIN Passengers p ON u.id = p.user_id
      LEFT JOIN Drivers d ON u.id = d.user_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const user = result.rows[0];
    res.json({
      status: 'success',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        profileImage: user.profile_picture_url,
        role: user.role,
        username: user.username,
        vehicleModel: user.vehicle_model,
        vehiclePlate: user.vehicle_plate,
        licenseNumber: user.license_number,
        vehicleType: user.vehicle_type,
        rating: user.rating,
        approvalStatus: user.approval_status
      }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch user profile' });
  } finally {
    client.release();
  }
});

// PUT Update User Profile
app.put('/api/user-profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { fullName, phoneNumber, email, profileImage, username, vehicleModel, vehiclePlate } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update Users table
    const updateUserQuery = `
      UPDATE Users
      SET full_name = COALESCE($1, full_name),
          phone_number = COALESCE($2, phone_number),
          email = COALESCE($3, email),
          profile_picture_url = COALESCE($4, profile_picture_url)
      WHERE id = $5
      RETURNING id, full_name, email, phone_number, profile_picture_url, role;
    `;
    const userRes = await client.query(updateUserQuery, [
      fullName || null,
      phoneNumber || null,
      email || null,
      profileImage || null,
      userId
    ]);

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Update Passengers table username if provided
    if (username) {
      await client.query(`
        UPDATE Passengers
        SET username = $1
        WHERE user_id = $2
      `, [username, userId]);
    }

    // Update Drivers table if vehicle info provided
    if (vehicleModel !== undefined || vehiclePlate !== undefined) {
      await client.query(`
        UPDATE Drivers
        SET vehicle_model = COALESCE($1, vehicle_model),
            vehicle_plate = COALESCE($2, vehicle_plate)
        WHERE user_id = $3
      `, [vehicleModel || null, vehiclePlate || null, userId]);
    }

    await client.query('COMMIT');
    const updated = userRes.rows[0];
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        fullName: updated.full_name,
        email: updated.email,
        phoneNumber: updated.phone_number,
        profileImage: updated.profile_picture_url,
        username: username || undefined,
        vehicleModel: vehicleModel || undefined,
        vehiclePlate: vehiclePlate || undefined
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update profile error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update profile' });
  } finally {
    client.release();
  }
});

// Helper to send Expo Push Notifications
async function sendPushNotification(pushToken, title, body, data = {}, channelId = 'rides') {
  if (!pushToken || typeof pushToken !== 'string') return;
  if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
    console.log('Skipping push notification; not an Expo push token:', pushToken);
    return;
  }

  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      channelId: channelId,
      priority: 'high',
      _displayInForeground: true
    };

    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
    console.log(`Push notification sent (${title}):`, response.data?.data?.status || 'delivered');
  } catch (error) {
    console.error('Error sending push notification:', error?.response?.data || error.message);
  }
}

// Helper to fetch user push token from database
async function getUserPushToken(userId) {
  if (!userId) return null;
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT push_token FROM Users WHERE id = $1', [userId]);
    return res.rows.length > 0 ? res.rows[0].push_token : null;
  } catch (err) {
    console.error('Error fetching push token for user', userId, err);
    return null;
  } finally {
    client.release();
  }
}

// POST Save or update user push notification token
app.post('/api/save-push-token', async (req, res) => {
  const { userId, pushToken } = req.body;
  if (!userId || !pushToken) {
    return res.status(400).json({ status: 'error', message: 'userId and pushToken are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('UPDATE Users SET push_token = $1 WHERE id = $2', [pushToken, userId]);
    res.json({ status: 'success', message: 'Push token saved successfully' });
  } catch (err) {
    console.error('Error saving push token:', err);
    res.status(500).json({ status: 'error', message: 'Failed to save push token' });
  } finally {
    client.release();
  }
});

// Helper to get PayPal Access Token
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data.access_token;
}

// POST Create PayPal Order
app.post('/api/wallet/paypal/create-order', async (req, res) => {
  const { userId, amount, returnUrl } = req.body;
  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid topup amount' });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'PHP',
          value: amount.toString()
        },
        description: `TrikeGo Wallet Topup`,
        custom_id: userId.toString()
      }],
      application_context: {
        return_url: returnUrl || 'trikeiligan://paypal-return',
        cancel_url: returnUrl || 'trikeiligan://paypal-cancel'
      }
    };

    const response = await axios.post('https://api-m.sandbox.paypal.com/v2/checkout/orders', orderData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const orderId = response.data.id;
    const approveLink = response.data.links.find(l => l.rel === 'approve').href;

    res.json({ status: 'success', checkoutUrl: approveLink, orderId });
  } catch (error) {
    console.error('PayPal create order error:', error.response ? error.response.data : error.message);
    res.status(500).json({ status: 'error', message: 'Failed to initiate topup' });
  }
});

// POST Capture PayPal Order
app.post('/api/wallet/paypal/capture-order', async (req, res) => {
  const { orderId, userId } = req.body;
  
  if (!orderId) {
    return res.status(400).json({ status: 'error', message: 'Order ID is required' });
  }

  try {
    // PRE-CHECK: If we already captured this, just return success immediately!
    const clientPreCheck = await pool.connect();
    try {
      const preCheck = await clientPreCheck.query('SELECT id FROM Transactions WHERE reference_id = $1', [orderId]);
      if (preCheck.rows.length > 0) {
        return res.json({ status: 'success', message: 'Topup already successful' });
      }
    } finally {
      clientPreCheck.release();
    }
    const accessToken = await getPayPalAccessToken();
    
    // First, fetch the order details to get the custom_id (userId)
    const orderDetailsRes = await axios.get(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const fetchedCustomId = orderDetailsRes.data.purchase_units[0]?.custom_id;

    // Call PayPal to capture the order
    const response = await axios.post(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.status === 'COMPLETED') {
      const amount = parseFloat(response.data.purchase_units[0].payments.captures[0].amount.value);
      const finalUserId = userId || fetchedCustomId;

      if (!finalUserId) {
        throw new Error("Could not determine user ID for this transaction.");
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Ensure this transaction wasn't already recorded
        const txCheck = await client.query('SELECT id FROM Transactions WHERE reference_id = $1', [orderId]);
        
        if (txCheck.rows.length === 0) {
          // Record transaction
          await client.query(`
            INSERT INTO Transactions (user_id, amount, transaction_type, status, reference_id)
            VALUES ($1, $2, 'TOPUP', 'COMPLETED', $3)
          `, [finalUserId, amount, orderId]);
          
          // Update user balance
          await client.query('UPDATE Users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2', [amount, finalUserId]);
        }
        
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Database transaction error:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      } finally {
        client.release();
      }

      res.json({ status: 'success', message: 'Topup successful' });
    } else {
      res.status(400).json({ status: 'error', message: 'Payment not completed' });
    }
  } catch (error) {
    console.error('PayPal capture error:', error.response ? error.response.data : error.message);
    res.status(500).json({ status: 'error', message: 'Failed to capture payment' });
  }
});

// POST PayPal Payout (Driver Cashout)
app.post('/api/wallet/payout', async (req, res) => {
  const { userId, amount, paypalEmail } = req.body;

  if (!userId || !amount || amount <= 0 || !paypalEmail) {
    return res.status(400).json({ status: 'error', message: 'Invalid payout request data' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Lock the user row and check balance
    const userRes = await client.query('SELECT wallet_balance FROM Users WHERE id = $1 FOR UPDATE', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const currentBalance = parseFloat(userRes.rows[0].wallet_balance || 0);
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Insufficient wallet balance' });
    }

    // 2. Call PayPal Payouts API
    const accessToken = await getPayPalAccessToken();
    const batchId = `Payout_${Date.now()}_${userId}`;
    
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: "You have a payout from TrikeGo!",
        email_message: "Here is your requested withdrawal from TrikeGo earnings."
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: parseFloat(amount).toFixed(2),
            currency: "PHP"
          },
          note: "Thanks for driving with TrikeIligan!",
          sender_item_id: `item_${Date.now()}`,
          receiver: paypalEmail,
        }
      ]
    };

    let payoutResponse;
    try {
      payoutResponse = await axios.post('https://api-m.sandbox.paypal.com/v1/payments/payouts', payoutData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (paypalErr) {
      console.error('PayPal payout error:', paypalErr.response ? paypalErr.response.data : paypalErr.message);
      // Let the frontend know the API call failed (could be due to unapproved merchant account for payouts)
      await client.query('ROLLBACK');
      return res.status(500).json({ 
        status: 'error', 
        message: 'PayPal Payout failed. Your merchant account might not be enabled for Payouts.' 
      });
    }

    const payoutBatchId = payoutResponse.data.batch_header.payout_batch_id;

    // 3. Deduct balance and record transaction
    await client.query('UPDATE Users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, userId]);
    
    await client.query(`
      INSERT INTO Transactions (user_id, amount, transaction_type, status, reference_id)
      VALUES ($1, $2, 'WITHDRAWAL', 'COMPLETED', $3)
    `, [userId, -amount, payoutBatchId]);

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Payout successful', batchId: payoutBatchId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database/Payout transaction error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error during payout' });
  } finally {
    client.release();
  }
});


// Fetch Ride History Endpoint
app.get('/api/rides/:userId', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
      SELECT r.id, r.pickup_address, r.dropoff_address, r.base_fare, r.payment_method, r.created_at, r.status,
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
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Fetch Driver Ride History Endpoint
app.get('/api/driver-rides/:driverId', async (req, res) => {
  const { driverId } = req.params;
  const client = await pool.connect();
  try {
    const query = `
      SELECT r.id, r.pickup_address, r.dropoff_address, r.base_fare, r.payment_method, r.created_at, r.status,
             u.full_name as passenger_name
      FROM Rides r
      LEFT JOIN Users u ON r.passenger_id = u.id
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await client.query(query, [driverId]);
    res.json({
      status: 'success',
      rides: result.rows
    });
  } catch (error) {
    console.error('Error fetching driver rides:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch driver rides' });
  } finally {
    client.release();
  }
});

// Rate Driver Endpoint
app.post('/api/rate-driver', async (req, res) => {
  const { driverId, passengerId, rating } = req.body;
  
  if (!driverId || !rating) {
    return res.status(400).json({ status: 'error', message: 'Driver ID and rating are required.' });
  }

  const client = await pool.connect();
  try {
    // Very simple rolling average calculation or direct update for MVP
    // We update the driver's overall rating in the Drivers table.
    // In a real production environment, you'd store individual ratings in a separate table and compute the average.
    const query = `
      UPDATE Drivers 
      SET rating = (rating + $1) / 2.0 
      WHERE user_id = $2
      RETURNING rating;
    `;
    const result = await client.query(query, [rating, driverId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Driver not found' });
    }
    
    res.json({ status: 'success', message: 'Rating submitted successfully', newRating: result.rows[0].rating });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit rating' });
  } finally {
    client.release();
  }
});

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO real-time event logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Helper function to broadcast live stats to admin dashboard
  const broadcastAdminStats = async () => {
    try {
      const activeDriversRoom = io.sockets.adapter.rooms.get('available_drivers');
      const activeDriversCount = activeDriversRoom ? activeDriversRoom.size : 0;

      const client = await pool.connect();
      try {
        const ridesQuery = await client.query(
          "SELECT COUNT(*) as ongoing_count FROM Rides WHERE status IN ('IN_PROGRESS', 'ACCEPTED')"
        );
        const revenueQuery = await client.query(
          "SELECT COALESCE(SUM(base_fare), 0) as daily_revenue FROM Rides WHERE status = 'COMPLETED' AND created_at >= CURRENT_DATE"
        );

        io.to('admin_room').emit('admin_stats_update', {
          activeDrivers: activeDriversCount,
          ongoingRides: parseInt(ridesQuery.rows[0].ongoing_count) || 0,
          dailyRevenue: parseFloat(revenueQuery.rows[0].daily_revenue) || 0
        });
      } finally {
        client.release();
      }
    } catch (e) {
      console.error('Error broadcasting admin stats:', e);
    }
  };

  // Helper function to broadcast live dispatch logs to admin dashboard
  const broadcastDispatchLog = (logItem) => {
    io.to('admin_room').emit('dispatch_log_update', logItem);
  };

  // Admin Web joins
  socket.on('admin_join', () => {
    socket.join('admin_room');
    broadcastAdminStats();
  });

  // 1. Driver goes online
  socket.on('driver_online', (data) => {
    console.log(`Driver ${data.driverId} is online with vehicleType ${data.vehicleType || 'TRICYCLE'}`);
    socket.join(`driver_${data.driverId}`);
    socket.join('available_drivers'); // Generic room
    if (data.vehicleType) {
      socket.join(`available_drivers_${data.vehicleType}`); // Specific room
    }
    broadcastAdminStats();
  });

  // 2. Passenger requests a ride
  socket.on('passenger_request_ride', (data) => {
    console.log(`Passenger ${data.passengerId} requested a ride for ${data.vehicleType || 'TRICYCLE'}`);
    // Broadcast the ride offer to drivers of the requested vehicle type
    const targetRoom = data.vehicleType ? `available_drivers_${data.vehicleType}` : 'available_drivers';
    io.to(targetRoom).emit('ride_offer', {
      rideId: data.rideId,
      passengerId: data.passengerId,
      passengerName: data.passengerName,
      pickup: data.pickup,
      dropoff: data.dropoff,
      pickupLat: data.pickupLat,
      pickupLon: data.pickupLon,
      dropoffLat: data.dropoffLat,
      dropoffLon: data.dropoffLon,
      fare: data.fare,
      rating: data.rating,
      paymentMethod: data.paymentMethod || 'CASH'
    });
  });

  // 3. Driver accepts ride
  socket.on('driver_accept_ride', async (data) => {
    console.log(`Driver ${data.driverId} accepted ride from Passenger ${data.passengerId}`);
    
    let driverPhoto = data.driverPhoto || data.driverImage || data.driver || null;
    if (!driverPhoto && data.driverId) {
      try {
        const client = await pool.connect();
        try {
          const uRes = await client.query('SELECT profile_picture_url FROM Users WHERE id = $1', [data.driverId]);
          if (uRes.rows.length > 0 && uRes.rows[0].profile_picture_url) {
            driverPhoto = uRes.rows[0].profile_picture_url;
          }
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Failed to query driver photo:', err);
      }
    }

    // Notify the specific passenger that their ride was accepted
    io.emit(`ride_accepted_${data.passengerId}`, {
      driverId: data.driverId,
      driverName: data.driverName,
      driverVehicle: data.driverVehicle,
      driverRating: data.driverRating,
      driverPhoto: driverPhoto,
      driverImage: driverPhoto,
      driver: driverPhoto,
      rideId: data.rideId
    });
    
    // Link both to a specific active ride room
    socket.join(`ride_${data.rideId}`);

    // Insert into Rides table
    (async () => {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO Rides (id, passenger_id, driver_id, status, pickup_address, dropoff_address, base_fare, payment_method)
          VALUES ($1, $2, $3, 'ACCEPTED', $4, $5, $6, $7)
        `, [data.rideId, data.passengerId, data.driverId, data.pickup || '', data.dropoff || '', data.fare || 0, data.paymentMethod || 'CASH']);

        broadcastDispatchLog({
          id: data.rideId,
          status: 'ACCEPTED',
          pickup_address: data.pickup || '',
          dropoff_address: data.dropoff || '',
          base_fare: data.fare || 0,
          payment_method: data.paymentMethod || 'CASH',
          created_at: new Date().toISOString(),
          passenger_name: data.passengerName || 'Passenger',
          driver_name: data.driverName || 'Driver'
        });
        broadcastAdminStats();
      } catch (e) {
        console.error('Error inserting ride into DB:', e);
      } finally {
        client.release();
      }
    })();

    // Send Push Notifications on Match
    (async () => {
      try {
        const passengerToken = await getUserPushToken(data.passengerId);
        if (passengerToken) {
          await sendPushNotification(
            passengerToken,
            'Driver Matched! 🛺',
            `${data.driverName} has accepted your ride (${data.driverVehicle || 'Kawasaki Barako 175'}).`,
            { type: 'RIDE_MATCHED', rideId: data.rideId, driverId: data.driverId },
            'rides'
          );
        }

        const driverToken = await getUserPushToken(data.driverId);
        if (driverToken) {
          await sendPushNotification(
            driverToken,
            'Ride Confirmed! ✅',
            `You are matched with ${data.passengerName || 'your passenger'}! Heading to pickup.`,
            { type: 'RIDE_MATCHED', rideId: data.rideId },
            'rides'
          );

          if (data.paymentMethod === 'WALLET') {
            await sendPushNotification(
              driverToken,
              'App Wallet Payment 💳',
              `Passenger is paying via App Wallet (₱${parseFloat(data.fare || 0).toFixed(2)}). No cash collection required!`,
              { type: 'WALLET_SELECTED', rideId: data.rideId, fare: data.fare },
              'payments'
            );
          }
        }
      } catch (err) {
        console.error('Error sending match push notifications:', err);
      }
    })();
  });

  // 4. Driver declines ride
  socket.on('driver_decline_ride', async (data) => {
    console.log(`Driver ${data.driverId} declined ride from Passenger ${data.passengerId}`);
    io.emit(`ride_declined_${data.passengerId}`, {
      driverId: data.driverId
    });

    try {
      const passengerToken = await getUserPushToken(data.passengerId);
      if (passengerToken) {
        await sendPushNotification(
          passengerToken,
          'Driver Unavailable',
          'The driver was unable to accept. Searching for nearby drivers...',
          { type: 'DRIVER_DECLINED', rideId: data.rideId },
          'rides'
        );
      }
    } catch (e) {
      console.error('Error sending decline push notification:', e);
    }
  });

  // 4.5 Driver cancels active ride
  socket.on('driver_cancel_ride', async (data) => {
    console.log(`Driver ${data.driverId} cancelled active ride ${data.rideId}`);
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'cancelled' });
    io.emit(`ride_cancelled_by_driver_${data.passengerId}`, { rideId: data.rideId });

    // Update in DB
    (async () => {
      const client = await pool.connect();
      try {
        await client.query("UPDATE Rides SET status = 'CANCELLED' WHERE id = $1", [data.rideId]);
        broadcastDispatchLog({ id: data.rideId, status: 'CANCELLED' });
      } catch (e) {} finally { client.release(); }
      broadcastAdminStats();
    })();

    try {
      const passengerToken = await getUserPushToken(data.passengerId);
      if (passengerToken) {
        await sendPushNotification(
          passengerToken,
          'Ride Cancelled by Driver ⚠️',
          'Your driver had to cancel this trip. Please try booking another ride.',
          { type: 'DRIVER_CANCELLED', rideId: data.rideId },
          'rides'
        );
      }
    } catch (e) {
      console.error('Error sending driver cancel push notification:', e);
    }
  });

  // 5. Driver updates live location during active ride
  socket.on('driver_update_location', (data) => {
    // Send location ONLY to the specific passenger connected to this ride room
    io.to(`ride_${data.rideId}`).emit('driver_location_update', {
      lat: data.lat,
      lon: data.lon,
      heading: data.heading
    });
  });

  // 6. Ride status updates (Picked Up, Completed, Cancelled)
  socket.on('passenger_cancel_ride', async (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'cancelled' });
    io.emit('cancel_ride_offer', { rideId: data.rideId });
    if (data.driverId) {
      io.emit(`ride_cancelled_by_passenger_${data.driverId}`, { rideId: data.rideId });

      try {
        const driverToken = await getUserPushToken(data.driverId);
        if (driverToken) {
          await sendPushNotification(
            driverToken,
            'Ride Cancelled ⚠️',
            'The passenger has cancelled the ride request.',
            { type: 'RIDE_CANCELLED', rideId: data.rideId },
            'rides'
          );
        }
      } catch (e) {
        console.error('Error sending passenger cancel push notification:', e);
      }
    }

    // Update in DB
    (async () => {
      const client = await pool.connect();
      try {
        await client.query("UPDATE Rides SET status = 'CANCELLED' WHERE id = $1", [data.rideId]);
        broadcastDispatchLog({ id: data.rideId, status: 'CANCELLED' });
      } catch(e) {} finally { client.release(); }
      broadcastAdminStats();
    })();
  });

  // 6.2 Passenger switches payment method to Wallet
  socket.on('passenger_switched_to_wallet', async (data) => {
    console.log(`Passenger ${data.passengerId} switched to Wallet payment for ride ${data.rideId}`);
    if (data.driverId) {
      io.emit(`passenger_switched_to_wallet_${data.driverId}`, {
        rideId: data.rideId,
        fare: data.fare,
        passengerName: data.passengerName
      });

      try {
        const driverToken = await getUserPushToken(data.driverId);
        if (driverToken) {
          await sendPushNotification(
            driverToken,
            'Payment Changed: App Wallet 💳',
            `${data.passengerName || 'Passenger'} selected App Wallet (₱${parseFloat(data.fare || 0).toFixed(2)}). No cash collection needed!`,
            { type: 'WALLET_SELECTED', rideId: data.rideId, fare: data.fare },
            'payments'
          );
        }
      } catch (err) {
        console.error('Error sending wallet switch push notification:', err);
      }
    }
  });

  // 6.3 Passenger switches payment method to Cash
  socket.on('passenger_switched_to_cash', async (data) => {
    console.log(`Passenger ${data.passengerId} switched to Cash payment for ride ${data.rideId}`);
    if (data.driverId) {
      io.emit(`passenger_switched_to_cash_${data.driverId}`, {
        rideId: data.rideId,
        fare: data.fare
      });

      try {
        const driverToken = await getUserPushToken(data.driverId);
        if (driverToken) {
          await sendPushNotification(
            driverToken,
            'Payment Changed: Cash 💵',
            `Passenger changed payment method to Cash (₱${parseFloat(data.fare || 0).toFixed(2)}). Collect upon drop-off.`,
            { type: 'CASH_SELECTED', rideId: data.rideId, fare: data.fare },
            'rides'
          );
        }
      } catch (err) {
        console.error('Error sending cash switch push notification:', err);
      }
    }
  });

  socket.on('passenger_picked_up', (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'picked_up' });
    if (data.passengerId) {
      io.emit(`ride_picked_up_${data.passengerId}`, { rideId: data.rideId });
    }

    // Update in DB
    (async () => {
      const client = await pool.connect();
      try {
        await client.query("UPDATE Rides SET status = 'IN_PROGRESS' WHERE id = $1", [data.rideId]);
        broadcastDispatchLog({ id: data.rideId, status: 'IN_PROGRESS' });
      } catch(e) {} finally { client.release(); }
      broadcastAdminStats();
    })();
  });

  socket.on('ride_completed', async (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'completed' });
    if (data.passengerId) {
      io.emit(`ride_completed_${data.passengerId}`, { rideId: data.rideId });
    }

    // Update in DB
    const updateRideDB = async () => {
      const client = await pool.connect();
      try {
        await client.query("UPDATE Rides SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = $1", [data.rideId]);
        broadcastDispatchLog({ id: data.rideId, status: 'COMPLETED', completed_at: new Date().toISOString() });
      } catch(e) {} finally { client.release(); }
      broadcastAdminStats();
    };
    updateRideDB();
    
    // Process wallet transaction if payment method is WALLET
    if (data.paymentMethod === 'WALLET' && data.passengerId && data.driverId && data.fare) {
      const fareAmount = parseFloat(data.fare);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Deduct from passenger
        await client.query('UPDATE Users SET wallet_balance = COALESCE(wallet_balance, 0) - $1 WHERE id = $2', [fareAmount, data.passengerId]);
        
        // Credit to driver
        await client.query('UPDATE Users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2', [fareAmount, data.driverId]);
        
        // Log transaction for passenger
        await client.query(`
          INSERT INTO Transactions (user_id, amount, transaction_type, status)
          VALUES ($1, $2, 'FARE_PAYMENT', 'COMPLETED')
        `, [data.passengerId, -fareAmount]);
        
        // Log transaction for driver
        await client.query(`
          INSERT INTO Transactions (user_id, amount, transaction_type, status)
          VALUES ($1, $2, 'EARNING', 'COMPLETED')
        `, [data.driverId, fareAmount]);
        
        await client.query('COMMIT');
        console.log(`Wallet payment processed for ride ${data.rideId}`);
        
        // Notify the driver that the payment was successful
        io.emit(`wallet_payment_success_${data.driverId}`, { 
            amount: fareAmount 
        });

        // Send Push Notifications for Wallet Payment
        (async () => {
          try {
            const driverToken = await getUserPushToken(data.driverId);
            if (driverToken) {
              await sendPushNotification(
                driverToken,
                'Wallet Payment Received! 💰',
                `₱${fareAmount.toFixed(2)} has been credited to your TrikeIligan Wallet!`,
                { type: 'WALLET_SUCCESS', amount: fareAmount, rideId: data.rideId },
                'payments'
              );
            }

            const passengerToken = await getUserPushToken(data.passengerId);
            if (passengerToken) {
              await sendPushNotification(
                passengerToken,
                'Payment Complete 💳',
                `₱${fareAmount.toFixed(2)} was successfully paid using your Wallet balance.`,
                { type: 'WALLET_PAID', amount: fareAmount, rideId: data.rideId },
                'payments'
              );
            }
          } catch (err) {
            console.error('Error sending wallet push notification:', err);
          }
        })();
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Wallet payment error:', e);
      } finally {
        client.release();
      }
    }
  });

  socket.on('cancel_ride', (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'cancelled' });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    broadcastAdminStats();
  });
});
// System Config Endpoint
app.get('/api/config', async (req, res) => {
  try {
    const query = await pool.query("SELECT * FROM System_Config LIMIT 1");
    if (query.rows.length > 0) {
      res.json({ status: 'success', data: query.rows[0] });
    } else {
      res.json({ status: 'success', data: { base_fare: 15.00, per_km_rate: 5.00 } });
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch config' });
  }
});

// Driver Stats Endpoint (Today's Earnings & Total Rides)
app.get('/api/driver-stats/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    
    // Total Completed Rides
    const ridesQuery = await pool.query(
      "SELECT COUNT(*) as total_rides FROM Rides WHERE driver_id = $1 AND status = 'COMPLETED'",
      [driverId]
    );
    
    // Today's Earnings
    // Using PostgreSQL CURRENT_DATE to get today's completed rides
    const earningsQuery = await pool.query(
      "SELECT SUM(base_fare) as today_earnings FROM Rides WHERE driver_id = $1 AND status = 'COMPLETED' AND DATE(completed_at) = CURRENT_DATE",
      [driverId]
    );

    const totalRides = parseInt(ridesQuery.rows[0].total_rides) || 0;
    const todayEarnings = parseFloat(earningsQuery.rows[0].today_earnings) || 0;

    res.json({
      status: 'success',
      data: {
        totalRides,
        todayEarnings
      }
    });
  } catch (err) {
    console.error('Error fetching driver stats:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// GET Pending Drivers
app.get('/api/admin/drivers/pending', async (req, res) => {
  try {
    const query = `
      SELECT u.id as user_id, u.full_name, u.phone_number, u.email, 
             d.id as driver_id, d.license_number, d.vehicle_plate, d.vehicle_model, 
             d.license_photo_url, d.created_at
      FROM Drivers d
      JOIN Users u ON d.user_id = u.id
      WHERE d.approval_status = 'PENDING'
    `;
    const result = await pool.query(query);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('Error fetching pending drivers:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST Approve Driver
app.post('/api/admin/drivers/:id/approve', async (req, res) => {
  const driverId = req.params.id; // user_id or driver_id
  try {
    const result = await pool.query(
      "UPDATE Drivers SET approval_status = 'APPROVED', is_active = true WHERE user_id = $1 RETURNING *",
      [driverId]
    );
    if (result.rowCount === 0) return res.status(404).json({ status: 'error', message: 'Driver not found' });
    res.json({ status: 'success', message: 'Driver approved successfully' });
  } catch (err) {
    console.error('Error approving driver:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST Reject Driver
app.post('/api/admin/drivers/:id/reject', async (req, res) => {
  const driverId = req.params.id;
  const { reason } = req.body;
  try {
    const result = await pool.query(
      "UPDATE Drivers SET approval_status = 'REJECTED', rejection_reason = $2 WHERE user_id = $1 RETURNING *",
      [driverId, reason || 'No reason provided']
    );
    if (result.rowCount === 0) return res.status(404).json({ status: 'error', message: 'Driver not found' });
    res.json({ status: 'success', message: 'Driver rejected successfully' });
  } catch (err) {
    console.error('Error rejecting driver:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET System Config
app.get('/api/admin/config', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM System_Config WHERE id = 1");
    if (result.rowCount === 0) {
      return res.json({ status: 'success', data: { base_fare: 20.0, per_km_rate: 5.0 } });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching config:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PUT System Config
app.put('/api/admin/config', async (req, res) => {
  const { base_fare, per_km_rate } = req.body;
  try {
    await pool.query(
      `INSERT INTO System_Config (id, base_fare, per_km_rate) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET base_fare = EXCLUDED.base_fare, per_km_rate = EXCLUDED.per_km_rate, updated_at = CURRENT_TIMESTAMP`,
      [base_fare, per_km_rate]
    );
    res.json({ status: 'success', message: 'Config updated successfully' });
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET Reports (Analytics)
app.get('/api/admin/reports', async (req, res) => {
  try {
    const ridesQuery = await pool.query("SELECT COUNT(*) as total FROM Rides WHERE status = 'COMPLETED'");
    const revenueQuery = await pool.query("SELECT SUM(base_fare) as total_revenue FROM Rides WHERE status = 'COMPLETED'");
    const activeDriversQuery = await pool.query("SELECT COUNT(*) as total FROM Drivers WHERE is_active = true");
    
    res.json({
      status: 'success',
      data: {
        totalRides: parseInt(ridesQuery.rows[0].total) || 0,
        totalRevenue: parseFloat(revenueQuery.rows[0].total_revenue) || 0,
        activeDrivers: parseInt(activeDriversQuery.rows[0].total) || 0
      }
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET Recent Dispatch Logs (Admin Monitoring)
app.get('/api/admin/dispatch-logs', async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;

    let query = `
      SELECT 
        r.id,
        r.status,
        r.pickup_address,
        r.dropoff_address,
        r.base_fare,
        r.payment_method,
        r.created_at,
        r.completed_at,
        p.full_name as passenger_name,
        d.full_name as driver_name
      FROM Rides r
      LEFT JOIN Users p ON r.passenger_id = p.id
      LEFT JOIN Users d ON r.driver_id = d.id
    `;

    const params = [];
    if (status && status !== 'ALL') {
      query += ` WHERE r.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 20);

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching dispatch logs:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
