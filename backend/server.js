const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
require('dotenv').config();

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
console.log('📧 EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
console.log('📧 ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'NOT SET');
console.log('🌐 NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const seedAdmin = require('./utils/seedAdmin');
const updateAdminCredentials = require('./utils/updateAdminCredentials');
const socketService = require('./services/socketService');

// Import routes
const authRoutes = require('./routes/auth');
const dishRoutes = require('./routes/dishes');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize WebSocket service
socketService.initialize(server);

// Seed admin user
seedAdmin();

// Update admin credentials
updateAdminCredentials();

// Security middleware
app.use(helmet());

// Enable gzip compression with better settings
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress if the request includes a no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    // Use compression for all other responses
    return compression.filter(req, res);
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://vkitchen.vercel.app',
  'https://v-kitchen.vercel.app',
  process.env.FRONTEND_URL,
  process.env.VITE_FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('Allowing request with no origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    }
    
    // In production, allow any Vercel domain
    if (process.env.NODE_ENV === 'production' && origin.includes('vercel.app')) {
      console.log('Vercel domain allowed:', origin);
      return callback(null, true);
    }
    
    console.log('Origin blocked:', origin);
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Additional CORS headers as fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'V Kitchen API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      dishes: '/api/v1/dishes',
      orders: '/api/v1/orders',
      admin: '/api/v1/admin',
      payments: '/api/v1/payments'
    }
  });
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'V Kitchen API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'connected'
  });
});

// Simple health check for load balancers
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dishes', dishRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/newsletter', require('./routes/newsletter'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Start server on fixed port
server.listen(PORT, () => {
  console.log(`V Kitchen server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`WebSocket server: ws://localhost:${PORT}`);
  console.log(`Connected users: ${socketService.getConnectedUsersCount()}`);
});

module.exports = { app, server };
