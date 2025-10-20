// Keep server warm to prevent cold starts
const axios = require('axios');

const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || 'https://v-kitchen-backend.onrender.com/api/v1/health';

// Ping server every 10 minutes to keep it warm
setInterval(async () => {
  try {
    console.log('🔥 KEEP ALIVE: Pinging server to prevent cold start...');
    await axios.get(KEEP_ALIVE_URL);
    console.log('✅ KEEP ALIVE: Server ping successful');
  } catch (error) {
    console.error('❌ KEEP ALIVE: Failed to ping server:', error.message);
  }
}, 10 * 60 * 1000); // 10 minutes

console.log('🚀 Keep Alive service started - server will stay warm!');
