require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  const client = await pool.connect();
  try {
    console.log("Checking if admin exists...");
    const checkAdmin = await client.query("SELECT * FROM Users WHERE role = 'ADMIN' LIMIT 1");
    
    if (checkAdmin.rows.length > 0) {
      console.log("Admin already exists!");
      console.log(checkAdmin.rows[0]);
      return;
    }

    console.log("Creating new admin user...");
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Insert into Users table
    const result = await client.query(`
      INSERT INTO Users (full_name, email, phone_number, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, full_name, email, role
    `, [
      'System Administrator', 
      'admin_iligan@trikeiligan.com', 
      '00000000000', 
      passwordHash, 
      'ADMIN'
    ]);

    const adminUser = result.rows[0];
    console.log("Created Admin User:", adminUser);

    // Insert into Admins table
    await client.query(`
      INSERT INTO Admins (user_id, permissions_level)
      VALUES ($1, $2)
    `, [adminUser.id, 3]); // Permissions level 3 for super admin

    console.log("Admin successfully seeded in DB.");
  } catch (err) {
    console.error("Error seeding admin:", err);
  } finally {
    client.release();
    pool.end();
  }
}

createAdmin();
