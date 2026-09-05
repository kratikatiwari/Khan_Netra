require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { query } = require('./config/database');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time notifications
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(`user:${userId}`));
  socket.on('disconnect', () => {});
});

app.set('socketio', io);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Scheduled jobs
// Daily document expiry check
cron.schedule('0 9 * * *', async () => {
  try {
    // Update document statuses
    await query(`UPDATE documents SET status = 'expired', updated_at = NOW() WHERE expiry_date < CURRENT_DATE AND status != 'expired' AND status != 'revoked'`);
    await query(`UPDATE documents SET status = 'expiring_soon', updated_at = NOW() WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' AND status = 'active'`);

    // Get newly expired docs
    const expired = await query(`SELECT d.title, d.mine_id, m.name as mine_name FROM documents d JOIN mines m ON d.mine_id = m.id WHERE d.expiry_date = CURRENT_DATE`);
    for (const doc of expired.rows) {
      const admins = await query(`SELECT id FROM users WHERE role IN ('admin', 'government_officer')`);
      for (const admin of admins.rows) {
        await query(
          `INSERT INTO notifications (id, user_id, mine_id, title, message, type, priority) VALUES ($1,$2,$3,$4,$5,'deadline','critical')`,
          [uuidv4(), admin.id, doc.mine_id, '🔴 Document Expired Today', `"${doc.title}" at ${doc.mine_name} expired today. Immediate renewal required.`]
        );
      }
    }
    console.log('✅ Daily document expiry check completed');
  } catch (e) { console.error('Cron error:', e.message); }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║          KhanNetra Server Started Successfully           ║
║   AI-Based Smart Governance & Compliance System          ║
╠══════════════════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}                         ║
║  API:     http://localhost:${PORT}/api/v1                  ║
║  Health:  http://localhost:${PORT}/api/v1/health           ║
║  Mode:    ${process.env.NODE_ENV || 'development'}                              ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, httpServer };
