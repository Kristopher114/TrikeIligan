require('dotenv').config();

async function queryNeon(sql) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not found in .env");

  // Extract host from connection string
  const urlMatch = dbUrl.match(/@([^/:]+)/);
  const host = urlMatch ? urlMatch[1] : null;
  if (!host) throw new Error("Could not parse host from DATABASE_URL");

  const res = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': dbUrl
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Neon SQL error: ${errorText}`);
  }

  const data = await res.json();
  return data.rows || [];
}

async function checkData() {
  try {
    console.log("=== USERS TABLE ===");
    const users = await queryNeon('SELECT id, full_name, email, phone_number, role, wallet_balance FROM Users');
    console.table(users);

    console.log("\n=== PASSENGERS TABLE ===");
    const passengers = await queryNeon('SELECT * FROM Passengers');
    console.table(passengers);

    console.log("\n=== DRIVERS TABLE ===");
    const drivers = await queryNeon(`
      SELECT d.license_number, d.vehicle_plate, d.vehicle_model, d.vehicle_type, d.rating, d.approval_status, u.full_name, u.email 
      FROM Drivers d
      JOIN Users u ON d.user_id = u.id
    `);
    console.table(drivers);

    console.log("\n=== TRANSACTIONS TABLE ===");
    const transactions = await queryNeon('SELECT * FROM Transactions');
    console.table(transactions);

  } catch (err) {
    console.error('Error fetching data:', err.message);
  }
}

checkData();
