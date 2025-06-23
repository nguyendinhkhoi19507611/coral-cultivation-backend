// routes/notifications.js
const express = require('express');
const Joi = require('joi');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const notificationSchema = Joi.object({
  title: Joi.string().required().max(100),
  message: Joi.string().required().max(500),
  shortMessage: Joi.string().max(100),
  type: Joi.string().valid(
    'booking_update', 'payment_status', 'cultivation_progress', 'experience_reminder',
    'weather_alert', 'system_maintenance', 'promotion', 'educational_content',
    'community_update', 'certificate_ready', 'review_reminder', 'custom'
  ).default('custom'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  icon: Joi.string().default('bell'),
  color: Joi.string().valid('blue', 'green', 'yellow', 'red', 'purple', 'gray').default('blue'),
  image: Joi.string().uri(),
  actionRequired: Joi.boolean().default(false),
  actionButton: Joi.object({
    text: Joi.string().required(),
    url: Joi.string().uri().required(),
    action: Joi.string()
  }),
  channels: Joi.array().items(
    Joi.string().valid('email', 'sms', 'push', 'in_app', 'webhook')
  ).default(['in_app']),
  scheduledFor: Joi.date().min('now'),
  expiresAt: Joi.date(),
  metadata: Joi.object(),
  recipients: Joi.array().items(Joi.string()).when('broadcast', {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  recipientType: Joi.string().valid('user', 'admin', 'business', 'all'),
  broadcast: Joi.boolean().default(false)
});

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      unreadOnly = false,
      includeExpired = false
    } = req.query;

    const notifications = await Notification.getUserNotifications(req.user._id, {
      page: Number(page),
      limit: Number(limit),
      type,
      unreadOnly: unreadOnly === 'true',
      includeExpired: includeExpired === 'true'
    });

    const total = await Notification.countDocuments({
      recipient: req.user._id,
      ...(type && { type }),
      ...(unreadOnly === 'true' && { isRead: false }),
      ...(!includeExpired && {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      })
    });

    res.json({
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Notification.getStats(req.user._id);
    
    res.json({
      stats: stats[0] || {
        total: 0,
        unread: 0,
        urgent: 0,
        actionRequired: 0
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ message: 'Server error while fetching notification stats' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead(req.io);

    res.json({
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id, req.io);

    res.json({
      message: 'All notifications marked as read',
      markedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error while marking all notifications as read' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Send real-time update
    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('notification_deleted', {
        notificationId
      });
    }

    res.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error while deleting notification' });
  }
});

// @route   POST /api/notifications/:id/interact
// @desc    Track notification interaction
// @access  Private
router.post('/:id/interact', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const { interactionType = 'click' } = req.body;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.trackInteraction(interactionType);

    res.json({
      message: 'Interaction tracked successfully',
      analytics: notification.analytics
    });

  } catch (error) {
    console.error('Track notification interaction error:', error);
    res.status(500).json({ message: 'Server error while tracking interaction' });
  }
});

// ADMIN ROUTES

// @route   POST /api/notifications/send
// @desc    Send notification to specific users (Admin)
// @access  Admin
router.post('/send', auth, adminAuth, async (req, res) => {
  try {
    const { error, value } = notificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const {
      recipients,
      broadcast,
      recipientType,
      scheduledFor,
      ...notificationData
    } = value;

    let targetUsers = [];

    if (broadcast) {
      // Broadcast to all users or specific type
      const filter = { isActive: true };
      if (recipientType && recipientType !== 'all') {
        filter.role = recipientType;
      }
      targetUsers = await User.find(filter).select('_id');
    } else {
      // Send to specific recipients
      targetUsers = await User.find({
        _id: { $in: recipients },
        isActive: true
      }).select('_id');
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ message: 'No valid recipients found' });
    }

    const createdNotifications = [];

    // Create notifications for each recipient
    for (const user of targetUsers) {
      const notification = await Notification.createAndSend({
        recipient: user._id,
        sender: req.user._id,
        senderType: 'admin',
        scheduledFor,
        ...notificationData
      }, req.io);

      createdNotifications.push(notification);
    }

    res.status(201).json({
      message: 'Notifications sent successfully',
      recipientCount: targetUsers.length,
      notifications: createdNotifications.slice(0, 5), // Return first 5 for preview
      scheduled: !!scheduledFor
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Server error while sending notification' });
  }
});

// @route   POST /api/notifications/broadcast
// @desc    Broadcast system message (Admin)
// @access  Admin
router.post('/broadcast', auth, adminAuth, async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'system_maintenance',
      priority = 'high',
      recipientType = 'all',
      channels = ['in_app', 'email'],
      expiresAt,
      actionButton
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    // Get target users
    const filter = { isActive: true };
    if (recipientType !== 'all') {
      filter.role = recipientType;
    }

    const users = await User.find(filter);

    if (users.length === 0) {
      return res.status(400).json({ message: 'No users found for broadcast' });
    }

    // Create notifications for all users
    const notifications = [];
    for (const user of users) {
      const notification = await Notification.createAndSend({
        recipient: user._id,
        type,
        title,
        message,
        priority,
        channels,
        expiresAt,
        actionButton,
        sender: req.user._id,
        senderType: 'admin',
        metadata: {
          broadcast: true,
          campaignId: `broadcast_${Date.now()}`,
          recipientType
        }
      }, req.io);

      notifications.push(notification);
    }

    // Send email notifications if requested
    if (channels.includes('email')) {
      // TODO: Implement bulk email sending
      console.log(`Sending emails to ${users.length} users...`);
    }

    res.json({
      message: 'Broadcast sent successfully',
      recipientCount: users.length,
      type,
      priority,
      channels
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ message: 'Server error while broadcasting notification' });
  }
});

// @route   GET /api/notifications/admin/all
// @desc    Get all notifications (Admin)
// @access  Admin
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      priority,
      recipientType,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (recipientType) filter.recipientType = recipientType;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') }
      ];
    }

    const notifications = await Notification.find(filter)
      .populate('recipient', 'name email role')
      .populate('sender', 'name email')
      .populate('relatedBooking', 'bookingNumber')
      .populate('relatedPackage', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

// @route   GET /api/notifications/admin/analytics
// @desc    Get notification analytics (Admin)
// @access  Admin
router.get('/admin/analytics', auth, adminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Delivery stats
    const deliveryStats = await Notification.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalSent: { $sum: 1 },
          emailSent: {
            $sum: { $cond: ['$deliveryStatus.email.sent', 1, 0] }
          },
          emailDelivered: {
            $sum: { $cond: ['$deliveryStatus.email.delivered', 1, 0] }
          },
          emailOpened: {
            $sum: { $cond: ['$deliveryStatus.email.opened', 1, 0] }
          },
          pushSent: {
            $sum: { $cond: ['$deliveryStatus.push.sent', 1, 0] }
          },
          pushDelivered: {
            $sum: { $cond: ['$deliveryStatus.push.delivered', 1, 0] }
          },
          pushClicked: {
            $sum: { $cond: ['$deliveryStatus.push.clicked', 1, 0] }
          },
          inAppViewed: {
            $sum: { $cond: ['$deliveryStatus.inApp.viewed', 1, 0] }
          },
          readRate: {
            $avg: { $cond: ['$isRead', 1, 0] }
          }
        }
      }
    ]);

    // Type distribution
    const typeStats = await Notification.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: ['$isRead', 1, 0] }
          },
          avgReadTime: {
            $avg: {
              $subtract: ['$readAt', '$createdAt']
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Priority distribution
    const priorityStats = await Notification.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          readRate: {
            $avg: { $cond: ['$isRead', 1, 0] }
          }
        }
      }
    ]);

    // Daily trend
    const dailyTrend = await Notification.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          sent: { $sum: 1 },
          read: {
            $sum: { $cond: ['$isRead', 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Engagement stats
    const engagementStats = await Notification.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: '$analytics.impressions' },
          totalClicks: { $sum: '$analytics.clicks' },
          totalConversions: { $sum: '$analytics.conversions' },
          avgImpressions: { $avg: '$analytics.impressions' },
          avgClicks: { $avg: '$analytics.clicks' }
        }
      }
    ]);

    res.json({
      period: `${days} days`,
      delivery: deliveryStats[0] || {},
      types: typeStats,
      priorities: priorityStats,
      dailyTrend,
      engagement: engagementStats[0] || {}
    });

  } catch (error) {
    console.error('Get notification analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
});

// @route   DELETE /api/notifications/admin/:id
// @desc    Delete notification (Admin)
// @access  Admin
router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Send real-time update to recipient
    if (req.io) {
      req.io.to(`user_${notification.recipient}`).emit('notification_deleted', {
        notificationId,
        deletedBy: 'admin'
      });
    }

    res.json({ 
      message: 'Notification deleted successfully',
      deletedNotification: {
        id: notification._id,
        title: notification.title,
        recipient: notification.recipient
      }
    });

  } catch (error) {
    console.error('Delete notification admin error:', error);
    res.status(500).json({ message: 'Server error while deleting notification' });
  }
});

// @route   POST /api/notifications/admin/cleanup
// @desc    Cleanup expired notifications (Admin)
// @access  Admin
router.post('/admin/cleanup', auth, adminAuth, async (req, res) => {
  try {
    const result = await Notification.cleanupExpired();

    res.json({
      message: 'Cleanup completed successfully',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Cleanup notifications error:', error);
    res.status(500).json({ message: 'Server error while cleaning up notifications' });
  }
});

// @route   GET /api/notifications/admin/templates
// @desc    Get notification templates (Admin)
// @access  Admin
router.get('/admin/templates', auth, adminAuth, async (req, res) => {
  try {
    const templates = [
      {
        id: 'booking_reminder',
        name: 'Nhắc nhở booking',
        type: 'booking_update',
        priority: 'medium',
        template: {
          title: 'Nhắc nhở: Booking #{bookingNumber}',
          message: 'Bạn có booking coral cultivation sắp đến hạn. Vui lòng chuẩn bị cho chuyến trải nghiệm.',
          actionButton: {
            text: 'Xem chi tiết',
            url: '/bookings/{bookingId}'
          }
        }
      },
      {
        id: 'experience_reminder',
        name: 'Nhắc nhở trải nghiệm',
        type: 'experience_reminder',
        priority: 'high',
        template: {
          title: 'Trải nghiệm sắp diễn ra',
          message: 'Trải nghiệm "{experienceTitle}" sẽ bắt đầu trong {timeUntil}. Hãy đến điểm hẹn đúng giờ.',
          actionButton: {
            text: 'Xem hướng dẫn',
            url: '/experiences/{experienceId}'
          }
        }
      },
      {
        id: 'weather_warning',
        name: 'Cảnh báo thời tiết',
        type: 'weather_alert',
        priority: 'urgent',
        template: {
          title: '⚠️ Cảnh báo thời tiết',
          message: 'Thời tiết tại {location} có thể ảnh hưởng đến trải nghiệm. Vui lòng theo dõi thông tin cập nhật.',
          actionButton: {
            text: 'Xem chi tiết',
            url: '/weather/{locationId}'
          }
        }
      },
      {
        id: 'promotion',
        name: 'Khuyến mãi',
        type: 'promotion',
        priority: 'low',
        template: {
          title: '🎉 Ưu đãi đặc biệt',
          message: 'Giảm {discount}% cho tất cả gói coral cultivation. Thời gian có hạn!',
          actionButton: {
            text: 'Xem gói',
            url: '/packages'
          }
        }
      },
      {
        id: 'maintenance',
        name: 'Bảo trì hệ thống',
        type: 'system_maintenance',
        priority: 'medium',
        template: {
          title: '🔧 Bảo trì hệ thống',
          message: 'Hệ thống sẽ được bảo trì từ {startTime} đến {endTime}. Có thể gặp gián đoạn dịch vụ.',
          actionButton: {
            text: 'Xem thông tin',
            url: '/maintenance'
          }
        }
      }
    ];

    res.json({ templates });

  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({ message: 'Server error while fetching templates' });
  }
});

// @route   POST /api/notifications/admin/send-template
// @desc    Send notification using template (Admin)
// @access  Admin
router.post('/admin/send-template', auth, adminAuth, async (req, res) => {
  try {
    const {
      templateId,
      recipients,
      variables = {},
      scheduledFor,
      recipientType = 'all'
    } = req.body;

    // Get template (in a real app, this would be from database)
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/notifications/admin/templates`);
    const { templates } = await response.json();
    
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Replace variables in template
    let { title, message, actionButton } = template.template;
    
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      title = title.replace(new RegExp(`{${key}}`, 'g'), value);
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
      if (actionButton?.url) {
        actionButton.url = actionButton.url.replace(new RegExp(`{${key}}`, 'g'), value);
      }
    });

    // Get target users
    let targetUsers = [];
    if (recipients && recipients.length > 0) {
      targetUsers = await User.find({
        _id: { $in: recipients },
        isActive: true
      });
    } else {
      const filter = { isActive: true };
      if (recipientType !== 'all') {
        filter.role = recipientType;
      }
      targetUsers = await User.find(filter);
    }

    // Send notifications
    const notifications = [];
    for (const user of targetUsers) {
      const notification = await Notification.createAndSend({
        recipient: user._id,
        type: template.type,
        title,
        message,
        priority: template.priority,
        actionButton,
        scheduledFor,
        sender: req.user._id,
        senderType: 'admin',
        metadata: {
          templateId,
          variables,
          campaignId: `template_${templateId}_${Date.now()}`
        }
      }, req.io);

      notifications.push(notification);
    }

    res.json({
      message: 'Template notification sent successfully',
      templateId,
      recipientCount: targetUsers.length,
      scheduled: !!scheduledFor
    });

  } catch (error) {
    console.error('Send template notification error:', error);
    res.status(500).json({ message: 'Server error while sending template notification' });
  }
});

module.exports = router;