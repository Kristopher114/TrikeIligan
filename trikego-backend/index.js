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
  const { fullName, email, phoneNumber, password, username, vehicleType } = req.body;

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
      INSERT INTO Drivers (user_id, vehicle_type)
      VALUES ($1, $2);
    `;
    const vType = vehicleType === 'SINGLE' ? 'SINGLE' : 'TRICYCLE';
    await client.query(insertDriverQuery, [userId, vType]);

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
      SELECT u.id, u.full_name, u.password_hash, u.role, d.vehicle_model, d.vehicle_type, d.rating
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
        vehicleModel: user.vehicle_model || 'Trike',
        vehicleType: user.vehicle_type || 'TRICYCLE',
        rating: user.rating || 5.0
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
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
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

  // 1. Driver goes online
  socket.on('driver_online', (data) => {
    console.log(`Driver ${data.driverId} is online with vehicleType ${data.vehicleType || 'TRICYCLE'}`);
    socket.join(`driver_${data.driverId}`);
    socket.join('available_drivers'); // Generic room
    if (data.vehicleType) {
      socket.join(`available_drivers_${data.vehicleType}`); // Specific room
    }
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
  socket.on('driver_accept_ride', (data) => {
    console.log(`Driver ${data.driverId} accepted ride from Passenger ${data.passengerId}`);
    
    // Notify the specific passenger that their ride was accepted
    io.emit(`ride_accepted_${data.passengerId}`, {
      driverId: data.driverId,
      driverName: data.driverName,
      driverVehicle: data.driverVehicle,
      driverRating: data.driverRating,
      rideId: data.rideId
    });
    
    // Link both to a specific active ride room
    socket.join(`ride_${data.rideId}`);
  });

  // 4. Driver declines ride
  socket.on('driver_decline_ride', (data) => {
    console.log(`Driver ${data.driverId} declined ride from Passenger ${data.passengerId}`);
    io.emit(`ride_declined_${data.passengerId}`, {
      driverId: data.driverId
    });
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
  socket.on('passenger_cancel_ride', (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'cancelled' });
    if (data.driverId) {
      io.emit(`ride_cancelled_by_passenger_${data.driverId}`, { rideId: data.rideId });
    }
  });
  socket.on('passenger_picked_up', (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'picked_up' });
    if (data.passengerId) {
      io.emit(`ride_picked_up_${data.passengerId}`, { rideId: data.rideId });
    }
  });

  socket.on('ride_completed', async (data) => {
    io.to(`ride_${data.rideId}`).emit('ride_status_update', { status: 'completed' });
    if (data.passengerId) {
      io.emit(`ride_completed_${data.passengerId}`, { rideId: data.rideId });
    }
    
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
          VALUES ($1, $2, 'PAYMENT', 'COMPLETED')
        `, [data.passengerId, -fareAmount]);
        
        // Log transaction for driver
        await client.query(`
          INSERT INTO Transactions (user_id, amount, transaction_type, status)
          VALUES ($1, $2, 'PAYMENT', 'COMPLETED')
        `, [data.driverId, fareAmount]);
        
        await client.query('COMMIT');
        console.log(`Wallet payment processed for ride ${data.rideId}`);
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
  });
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
