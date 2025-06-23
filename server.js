// server.js - Enhanced with Socket.io
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const packageRoutes = require('./routes/packages');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const experienceRoutes = require('./routes/experiences');
const notificationRoutes = require('./routes/notifications');

// Import Socket service
const SocketService = require('./utils/socket');

// Import models for scheduled tasks
const Booking = require('./models/Booking');
const Notification = require('./models/Notification');
const { sendEmail } = require('./utils/email');

const app = express();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize Socket service
const socketService = new SocketService(io);

// Make io available to routes
app.use((req, res, next) => {
  req.io = socketService;
  next();
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow socket.io connections
}));
app.use(morgan('combined'));

// Rate limiting with different limits for different endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// CORS configuration
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  
  // Test cloudinary connection
  const { testConnection } = require('./utils/cloudinary');
  testConnection();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    message: 'Coral Cultivation API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: socketService.getConnectedUsersCount(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.json(health);
});

// Socket.io health endpoint
app.get('/api/health/socket', (req, res) => {
  const socketHealth = {
    status: 'OK',
    connectedUsers: socketService.getConnectedUsersCount(),
    rooms: io.sockets.adapter.rooms.size,
    timestamp: new Date().toISOString()
  };
  
  res.json(socketHealth);
});

// Scheduled tasks
console.log('⏰ Setting up scheduled tasks...');

// Send experience reminders (every hour)
cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔔 Running experience reminder task...');
    
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours ahead
    
    const upcomingExperiences = await Booking.aggregate([
      { $unwind: '$experienceBookings' },
      {
        $match: {
          'experienceBookings.status': 'scheduled',
          'experienceBookings.scheduledDate': {
            $gte: now,
            $lte: reminderTime
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      }
    ]);

    for (const booking of upcomingExperiences) {
      const experience = booking.experienceBookings;
      const timeUntil = Math.round((experience.scheduledDate - now) / (1000 * 60 * 60));
      
      await Notification.createAndSend({
        recipient: booking.user,
        type: 'experience_reminder',
        title: '⏰ Nhắc nhở trải nghiệm',
        message: `Trải nghiệm "${experience.title}" sẽ bắt đầu trong ${timeUntil} giờ nữa. Hãy chuẩn bị sẵn sàng!`,
        priority: 'high',
        relatedBooking: booking._id,
        relatedExperience: experience._id,
        actionButton: {
          text: 'Xem chi tiết',
          url: `/experiences/${experience._id}`
        },
        channels: ['in_app', 'email'],
        metadata: {
          experienceId: experience._id,
          hoursUntil: timeUntil
        }
      }, socketService);
    }
    
    console.log(`✅ Sent ${upcomingExperiences.length} experience reminders`);
  } catch (error) {
    console.error('❌ Experience reminder task error:', error);
  }
});

// Send cultivation progress updates (daily at 9 AM)
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🌱 Running daily cultivation update task...');
    
    const activeBookings = await Booking.find({
      status: 'growing',
      'cultivation.startDate': { $exists: true }
    }).populate('user package');

    for (const booking of activeBookings) {
      const daysSinceStart = Math.floor(
        (new Date() - booking.cultivation.startDate) / (1000 * 60 * 60 * 24)
      );
      
      // Send weekly updates
      if (daysSinceStart % 7 === 0 && daysSinceStart > 0) {
        await Notification.createAndSend({
          recipient: booking.user._id,
          type: 'cultivation_progress',
          title: '🪸 Cập nhật tăng trưởng san hô',
          message: `San hô của bạn đã được trồng được ${daysSinceStart} ngày. Quá trình phát triển đang diễn ra tốt đẹp!`,
          priority: 'medium',
          relatedBooking: booking._id,
          actionButton: {
            text: 'Xem tiến độ',
            url: `/bookings/${booking._id}`
          },
          metadata: {
            daysSinceStart,
            weekNumber: Math.floor(daysSinceStart / 7)
          }
        }, socketService);
      }
    }
    
    console.log('✅ Daily cultivation updates completed');
  } catch (error) {
    console.error('❌ Daily cultivation update task error:', error);
  }
});

// Cleanup expired notifications (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('🧹 Running notification cleanup task...');
    
    const result = await Notification.cleanupExpired();
    console.log(`✅ Cleaned up ${result.deletedCount} expired notifications`);
  } catch (error) {
    console.error('❌ Notification cleanup task error:', error);
  }
});

// Send payment reminders (daily at 10 AM)
cron.schedule('0 10 * * *', async () => {
  try {
    console.log('💳 Running payment reminder task...');
    
    const pendingPayments = await Booking.find({
      paymentStatus: 'pending',
      createdAt: { 
        $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
      }
    }).populate('user package');

    for (const booking of pendingPayments) {
      const daysPending = Math.floor(
        (new Date() - booking.createdAt) / (1000 * 60 * 60 * 24)
      );
      
      if ([1, 3, 7].includes(daysPending)) { // Send reminders after 1, 3, and 7 days
        await Notification.createAndSend({
          recipient: booking.user._id,
          type: 'payment_reminder',
          title: '💳 Nhắc nhở thanh toán',
          message: `Booking ${booking.bookingNumber} chưa được thanh toán. Vui lòng hoàn tất thanh toán để kích hoạt dịch vụ.`,
          priority: 'high',
          relatedBooking: booking._id,
          actionRequired: true,
          actionButton: {
            text: 'Thanh toán ngay',
            url: `/bookings/${booking._id}/payment`
          },
          channels: ['in_app', 'email'],
          metadata: {
            daysPending,
            amount: booking.totalAmount
          }
        }, socketService);
      }
    }
    
    console.log('✅ Payment reminders completed');
  } catch (error) {
    console.error('❌ Payment reminder task error:', error);
  }
});

// Weather monitoring (every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('🌤️ Running weather monitoring task...');
    
    // This is a placeholder - integrate with actual weather API
    const locations = ['Nha Trang', 'Phú Quốc', 'Côn Đảo', 'Hạ Long'];
    
    for (const location of locations) {
      // Simulate weather check (replace with real weather API)
      const weatherAlert = Math.random() < 0.1; // 10% chance of alert
      
      if (weatherAlert) {
        await socketService.sendWeatherAlert(location, {
          message: 'Dự báo có gió mạnh và sóng lớn trong 24h tới',
          severity: 'moderate',
          windSpeed: '25-35 km/h',
          waveHeight: '1.5-2.5m'
        });
      }
    }
    
    console.log('✅ Weather monitoring completed');
  } catch (error) {
    console.error('❌ Weather monitoring task error:', error);
  }
});

// Send weekly digest (every Sunday at 8 AM)
cron.schedule('0 8 * * 0', async () => {
  try {
    console.log('📊 Running weekly digest task...');
    
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get active users
    const activeUsers = await User.find({ 
      isActive: true,
      lastLogin: { $gte: oneWeekAgo }
    });

    for (const user of activeUsers) {
      // Get user's weekly stats
      const weeklyStats = await Booking.aggregate([
        { $match: { user: user._id, updatedAt: { $gte: oneWeekAgo } } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            progressUpdates: { $sum: { $size: '$cultivation.progress' } },
            completedExperiences: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$experienceBookings',
                    cond: { $eq: ['$this.status', 'completed'] }
                  }
                }
              }
            }
          }
        }
      ]);

      if (weeklyStats.length > 0) {
        const stats = weeklyStats[0];
        
        await Notification.createAndSend({
          recipient: user._id,
          type: 'community_update',
          title: '📊 Tổng kết tuần của bạn',
          message: `Tuần này bạn có ${stats.progressUpdates} cập nhật tiến độ và ${stats.completedExperiences} trải nghiệm hoàn thành. Cảm ơn bạn đã đóng góp vào việc bảo vệ san hô!`,
          priority: 'low',
          actionButton: {
            text: 'Xem chi tiết',
            url: '/dashboard'
          },
          channels: ['in_app', 'email'],
          metadata: {
            weeklyStats: stats,
            weekOf: new Date().toISOString().split('T')[0]
          }
        }, socketService);
      }
    }
    
    console.log(`✅ Sent weekly digest to ${activeUsers.length} users`);
  } catch (error) {
    console.error('❌ Weekly digest task error:', error);
  }
});

// System health check (every 30 minutes)
cron.schedule('*/30 * * * *', async () => {
  try {
    const health = {
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: socketService.getConnectedUsersCount(),
      dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
    
    // Log health status
    console.log(`🏥 System Health: ${health.connections.total} users online, Memory: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`);
    
    // Alert if memory usage is too high
    const memoryUsageMB = health.memory.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 512) { // Alert if memory > 512MB
      console.warn(`⚠️ High memory usage: ${Math.round(memoryUsageMB)}MB`);
      
      // Send alert to admins
      const admins = await User.find({ role: 'admin', isActive: true });
      for (const admin of admins) {
        await Notification.createAndSend({
          recipient: admin._id,
          type: 'system_maintenance',
          title: '⚠️ Cảnh báo hệ thống',
          message: `Bộ nhớ hệ thống đang cao: ${Math.round(memoryUsageMB)}MB. Cần kiểm tra hiệu suất.`,
          priority: 'urgent',
          actionRequired: true,
          channels: ['in_app']
        }, socketService);
      }
    }
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database connection lost!');
      
      // Try to reconnect
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database reconnected');
      } catch (reconnectError) {
        console.error('❌ Failed to reconnect to database:', reconnectError);
      }
    }
    
  } catch (error) {
    console.error('❌ Health check task error:', error);
  }
});

// Auto-complete overdue experiences (every hour)
cron.schedule('0 * * * *', async () => {
  try {
    console.log('⏰ Checking for overdue experiences...');
    
    const overdueTime = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
    
    const overdueExperiences = await Booking.find({
      'experienceBookings.status': 'in_progress',
      'experienceBookings.scheduledDate': { $lt: overdueTime }
    });

    for (const booking of overdueExperiences) {
      for (const experience of booking.experienceBookings) {
        if (experience.status === 'in_progress' && experience.scheduledDate < overdueTime) {
          // Auto-complete overdue experience
          experience.status = 'completed';
          experience.actualEndTime = new Date();
          experience.notes = 'Auto-completed due to overdue status';
          experience.updatedAt = new Date();
          
          await booking.save();
          
          // Notify user
          await Notification.createAndSend({
            recipient: booking.user,
            type: 'experience_completed',
            title: 'Trải nghiệm đã hoàn thành',
            message: `Trải nghiệm "${experience.title}" đã được tự động đánh dấu hoàn thành.`,
            priority: 'medium',
            relatedBooking: booking._id,
            relatedExperience: experience._id
          }, socketService);
          
          console.log(`✅ Auto-completed overdue experience: ${experience.title}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Overdue experience check error:', error);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  
  // Send alert to admins in production
  if (process.env.NODE_ENV === 'production') {
    // Log to external service or send email alert
    console.error('🚨 Critical error in production:', error.stack);
  }
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Send alert to admins in production
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Critical promise rejection in production:', reason);
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    endpoint: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global error handler:', err.stack);
  
  // Send error notification to admins in production
  if (process.env.NODE_ENV === 'production') {
    User.find({ role: 'admin', isActive: true }).then(admins => {
      admins.forEach(admin => {
        Notification.createAndSend({
          recipient: admin._id,
          type: 'system_maintenance',
          title: '🚨 Lỗi hệ thống',
          message: `Phát hiện lỗi trong API: ${err.message}`,
          priority: 'urgent',
          metadata: {
            error: err.message,
            stack: err.stack,
            endpoint: req.originalUrl,
            method: req.method,
            timestamp: new Date()
          }
        }, socketService);
      });
    });
  }
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    ...(isDevelopment && {
      error: err.message,
      stack: err.stack,
      endpoint: req.originalUrl,
      method: req.method
    }),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`📡 Socket.io enabled with CORS`);
  console.log(`⏰ Scheduled tasks initialized`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket health check at: http://localhost:${PORT}/api/health/socket`);
  
  // Log startup memory usage
  const memUsage = process.memoryUsage();
  console.log(`💾 Initial memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
});