const axios = require('axios');

async function checkPayouts() {
  try {
    const auth = Buffer.from('BAA4WAS9tg54YqQj8FA2z5iUErIY4yh0RFqnIU8oRGfAPERKAv36528bQDN8K5pTVWlRFs1L-sjcFsuvZ8:EEBZqeMg4QuCx6USSntGoxnT4ZIWhropYBmgEQea-fVzlLFIjSfNzG8iwJEIh16MrqBy_4Ertar1fJPA').toString('base64');
    
    // Get token
    const tokenRes = await axios.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const token = tokenRes.data.access_token;
    console.log("Token generated.");

    // The user just did a transaction. The DB has it. Wait, I'll just check all recent payouts if I can't find the batch id.
    // Actually, I can just query the DB for the reference_id of the last withdrawal.
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: "postgresql://neondb_owner:npg_OENG6TS4jiqg@ep-floral-shadow-az61bbe3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        ssl: { rejectUnauthorized: false }
    });

    const txs = await pool.query("SELECT reference_id FROM Transactions WHERE transaction_type = 'WITHDRAWAL' ORDER BY created_at DESC LIMIT 1");
    if (txs.rows.length === 0) {
        console.log("No withdrawals found");
        process.exit(0);
    }
    const batchId = txs.rows[0].reference_id;
    console.log("Found batch ID:", batchId);

    // Get payout status
    const payoutRes = await axios.get(`https://api-m.sandbox.paypal.com/v1/payments/payouts/${batchId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    console.log("Payout Status:", JSON.stringify(payoutRes.data, null, 2));

  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

checkPayouts();
