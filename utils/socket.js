// utils/socket.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

class SocketService {
  constructor(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
    this.adminSockets = new Set(); // admin socket IDs
    this.businessSockets = new Set(); // business socket IDs
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }
        
        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }
        
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      this.handleDisconnection(socket);
      this.handleNotificationEvents(socket);
      this.handleBookingEvents(socket);
      this.handleExperienceEvents(socket);
      this.handleAdminEvents(socket);
    });
  }

  handleConnection(socket) {
    const user = socket.user;
    console.log(`🔗 User connected: ${user.name} (${user.email})`);
    
    // Store user connection
    this.connectedUsers.set(user._id.toString(), socket.id);
    this.userSockets.set(socket.id, user._id.toString());
    
    // Join user to their personal room
    socket.join(`user_${user._id}`);
    
    // Join role-based rooms
    if (user.role === 'admin') {
      socket.join('admin_room');
      this.adminSockets.add(socket.id);
    } else if (user.role === 'business') {
      socket.join('business_room');
      this.businessSockets.add(socket.id);
    }
    
    // Send user's unread notification count
    this.sendUnreadNotificationCount(user._id);
    
    // Emit connection status to user
    socket.emit('connected', {
      message: 'Kết nối thành công',
      userId: user._id,
      timestamp: new Date()
    });
    
    // Broadcast online status to relevant users (admin)
    socket.to('admin_room').emit('user_online', {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      timestamp: new Date()
    });
  }

  handleDisconnection(socket) {
    socket.on('disconnect', () => {
      const userId = this.userSockets.get(socket.id);
      if (userId) {
        console.log(`🔌 User disconnected: ${userId}`);
        
        // Remove from tracking
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);
        this.adminSockets.delete(socket.id);
        this.businessSockets.delete(socket.id);
        
        // Broadcast offline status to admin
        socket.to('admin_room').emit('user_offline', {
          userId,
          timestamp: new Date()
        });
      }
    });
  }

  handleNotificationEvents(socket) {
    // Mark notification as read
    socket.on('mark_notification_read', async (data) => {
      try {
        const { notificationId } = data;
        const notification = await Notification.findById(notificationId);
        
        if (notification && notification.recipient.toString() === socket.user._id.toString()) {
          await notification.markAsRead(this.io);
          
          // Send updated unread count
          this.sendUnreadNotificationCount(socket.user._id);
        }
      } catch (error) {
        console.error('Mark notification read error:', error);
        socket.emit('error', { message: 'Không thể đánh dấu thông báo đã đọc' });
      }
    });

    // Mark all notifications as read
    socket.on('mark_all_notifications_read', async () => {
      try {
        await Notification.markAllAsRead(socket.user._id, this.io);
        this.sendUnreadNotificationCount(socket.user._id);
        
        socket.emit('all_notifications_marked_read', {
          message: 'Đã đánh dấu tất cả thông báo đã đọc'
        });
      } catch (error) {
        console.error('Mark all notifications read error:', error);
        socket.emit('error', { message: 'Không thể đánh dấu tất cả thông báo' });
      }
    });

    // Get notifications
    socket.on('get_notifications', async (data) => {
      try {
        const { page = 1, limit = 20, unreadOnly = false } = data || {};
        
        const notifications = await Notification.getUserNotifications(socket.user._id, {
          page,
          limit,
          unreadOnly
        });
        
        socket.emit('notifications_loaded', {
          notifications,
          page,
          hasMore: notifications.length === limit
        });
      } catch (error) {
        console.error('Get notifications error:', error);
        socket.emit('error', { message: 'Không thể tải thông báo' });
      }
    });
  }

  handleBookingEvents(socket) {
    // Join booking room for real-time updates
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking_${bookingId}`);
      console.log(`User ${socket.user.name} joined booking room: ${bookingId}`);
    });

    // Leave booking room
    socket.on('leave_booking', (bookingId) => {
      socket.leave(`booking_${bookingId}`);
      console.log(`User ${socket.user.name} left booking room: ${bookingId}`);
    });

    // Request real-time booking data
    socket.on('get_booking_realtime', async (bookingId) => {
      try {
        const booking = await Booking.findById(bookingId)
          .populate('package', 'name location')
          .populate('user', 'name email');
        
        if (!booking) {
          return socket.emit('error', { message: 'Booking không tồn tại' });
        }
        
        // Check if user has access to this booking
        if (booking.user._id.toString() !== socket.user._id.toString() && 
            socket.user.role !== 'admin') {
          return socket.emit('error', { message: 'Không có quyền truy cập booking này' });
        }
        
        socket.emit('booking_realtime_data', {
          booking: booking.toObject(),
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Get booking real-time error:', error);
        socket.emit('error', { message: 'Không thể tải dữ liệu booking' });
      }
    });
  }

  handleExperienceEvents(socket) {
    // Join experience room
    socket.on('join_experience', (experienceId) => {
      socket.join(`experience_${experienceId}`);
      console.log(`User ${socket.user.name} joined experience room: ${experienceId}`);
    });

    // Update experience status (Admin only)
    socket.on('update_experience_status', async (data) => {
      try {
        if (socket.user.role !== 'admin') {
          return socket.emit('error', { message: 'Không có quyền cập nhật trải nghiệm' });
        }

        const { bookingId, experienceId, status, notes } = data;
        
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          return socket.emit('error', { message: 'Booking không tồn tại' });
        }

        const experience = booking.experienceBookings.id(experienceId);
        if (!experience) {
          return socket.emit('error', { message: 'Trải nghiệm không tồn tại' });
        }

        experience.status = status;
        if (notes) experience.notes = notes;
        experience.updatedAt = new Date();

        await booking.save();

        // Notify all participants in the experience room
        this.io.to(`experience_${experienceId}`).emit('experience_status_updated', {
          experienceId,
          status,
          notes,
          updatedBy: socket.user.name,
          timestamp: new Date()
        });

        // Send notification to booking owner
        await this.sendNotificationToUser(booking.user, {
          type: 'experience_update',
          title: 'Cập nhật trải nghiệm',
          message: `Trải nghiệm "${experience.title}" đã được cập nhật trạng thái: ${status}`,
          priority: 'medium',
          relatedBooking: bookingId,
          relatedExperience: experienceId,
          metadata: { status, notes }
        });

      } catch (error) {
        console.error('Update experience status error:', error);
        socket.emit('error', { message: 'Không thể cập nhật trạng thái trải nghiệm' });
      }
    });

    // Share experience photos/videos in real-time
    socket.on('share_experience_media', async (data) => {
      try {
        const { experienceId, mediaType, mediaUrl, caption } = data;
        
        // Broadcast to all users in the experience room
        this.io.to(`experience_${experienceId}`).emit('experience_media_shared', {
          experienceId,
          mediaType,
          mediaUrl,
          caption,
          sharedBy: socket.user.name,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Share experience media error:', error);
        socket.emit('error', { message: 'Không thể chia sẻ media' });
      }
    });
  }

  handleAdminEvents(socket) {
    if (socket.user.role !== 'admin') return;

    // Broadcast system message to all users
    socket.on('broadcast_system_message', async (data) => {
      try {
        const { message, type = 'system_announcement', priority = 'medium', targetRole } = data;
        
        let targetRoom = 'all_users';
        if (targetRole === 'business') targetRoom = 'business_room';
        else if (targetRole === 'customer') targetRoom = 'customer_room';

        // Create notifications for all target users
        const users = await User.find(
          targetRole ? { role: targetRole, isActive: true } : { isActive: true }
        );

        for (const user of users) {
          await Notification.createAndSend({
            recipient: user._id,
            type,
            title: 'Thông báo hệ thống',
            message,
            priority,
            sender: socket.user._id,
            senderType: 'admin',
            channels: ['in_app', 'email']
          }, this.io);
        }

        socket.emit('broadcast_complete', {
          message: 'Đã gửi thông báo thành công',
          recipientCount: users.length
        });

      } catch (error) {
        console.error('Broadcast system message error:', error);
        socket.emit('error', { message: 'Không thể gửi thông báo hệ thống' });
      }
    });

    // Get real-time dashboard stats
    socket.on('get_dashboard_stats', async () => {
      try {
        const stats = await this.getDashboardStats();
        socket.emit('dashboard_stats', stats);
      } catch (error) {
        console.error('Get dashboard stats error:', error);
        socket.emit('error', { message: 'Không thể tải thống kê dashboard' });
      }
    });

    // Monitor system health
    socket.on('get_system_health', () => {
      const health = {
        connectedUsers: this.connectedUsers.size,
        adminUsers: this.adminSockets.size,
        businessUsers: this.businessSockets.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
      };
      
      socket.emit('system_health', health);
    });
  }

  // Helper methods
  async sendNotificationToUser(userId, notificationData) {
    try {
      const notification = await Notification.createAndSend({
        recipient: userId,
        ...notificationData
      }, this.io);
      
      return notification;
    } catch (error) {
      console.error('Send notification to user error:', error);
    }
  }

  async sendUnreadNotificationCount(userId) {
    try {
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false
      });
      
      this.io.to(`user_${userId}`).emit('unread_notification_count', { count });
    } catch (error) {
      console.error('Send unread notification count error:', error);
    }
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalBookings,
      totalRevenue,
      activeExperiences
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Booking.aggregate([
        { $unwind: '$experienceBookings' },
        { $match: { 'experienceBookings.status': 'scheduled' } },
        { $count: 'total' }
      ])
    ]);

    return {
      connectedUsers: this.connectedUsers.size,
      totalUsers,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      activeExperiences: activeExperiences[0]?.total || 0,
      timestamp: new Date()
    };
  }

  // Broadcast to all users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Broadcast to specific role
  broadcastToRole(role, event, data) {
    this.io.to(`${role}_room`).emit(event, data);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Send booking update to user
  async sendBookingUpdate(bookingId, updateData) {
    try {
      const booking = await Booking.findById(bookingId).populate('user');
      if (!booking) return;

      // Send to booking room
      this.io.to(`booking_${bookingId}`).emit('booking_updated', {
        bookingId,
        bookingNumber: booking.bookingNumber,
        ...updateData,
        timestamp: new Date()
      });

      // Send to user's personal room
      this.io.to(`user_${booking.user._id}`).emit('booking_updated', {
        bookingId,
        bookingNumber: booking.bookingNumber,
        ...updateData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Send booking update error:', error);
    }
  }

  // Send experience update
  async sendExperienceUpdate(bookingId, experienceId, updateData) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) return;

      const experience = booking.experienceBookings.id(experienceId);
      if (!experience) return;

      // Send to experience room
      this.io.to(`experience_${experienceId}`).emit('experience_updated', {
        experienceId,
        experienceTitle: experience.title,
        ...updateData,
        timestamp: new Date()
      });

      // Send to booking owner
      this.io.to(`user_${booking.user}`).emit('experience_updated', {
        experienceId,
        experienceTitle: experience.title,
        bookingNumber: booking.bookingNumber,
        ...updateData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Send experience update error:', error);
    }
  }

  // Weather alert system
  async sendWeatherAlert(locationName, alertData) {
    try {
      // Find all bookings with experiences in the affected location
      const affectedBookings = await Booking.find({
        'experienceBookings.location.name': locationName,
        'experienceBookings.status': 'scheduled',
        'experienceBookings.scheduledDate': {
          $gte: new Date(),
          $lte: new Date(Date.now() + 48 * 60 * 60 * 1000) // Next 48 hours
        }
      }).populate('user');

      for (const booking of affectedBookings) {
        // Send notification
        await this.sendNotificationToUser(booking.user._id, {
          type: 'weather_alert',
          title: '⚠️ Cảnh báo thời tiết',
          message: `Thời tiết tại ${locationName} có thể ảnh hưởng đến trải nghiệm của bạn. ${alertData.message}`,
          priority: 'high',
          relatedBooking: booking._id,
          actionRequired: true,
          actionButton: {
            text: 'Xem chi tiết',
            url: `/bookings/${booking._id}/experiences`
          },
          metadata: {
            location: locationName,
            weatherData: alertData
          }
        });
      }

    } catch (error) {
      console.error('Send weather alert error:', error);
    }
  }

  // Get connected users count by role
  getConnectedUsersCount() {
    return {
      total: this.connectedUsers.size,
      admin: this.adminSockets.size,
      business: this.businessSockets.size,
      customer: this.connectedUsers.size - this.adminSockets.size - this.businessSockets.size
    };
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }
}

module.exports = SocketService;