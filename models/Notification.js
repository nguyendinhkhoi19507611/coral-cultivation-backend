const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientType: {
    type: String,
    enum: ['user', 'admin', 'business', 'all'],
    default: 'user'
  },
  type: {
    type: String,
    enum: [
      'booking_update',
      'payment_status',
      'cultivation_progress',
      'experience_reminder',
      'weather_alert',
      'system_maintenance',
      'promotion',
      'educational_content',
      'community_update',
      'certificate_ready',
      'review_reminder',
      'custom'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  shortMessage: {
    type: String,
    maxlength: 100
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  icon: {
    type: String,
    default: 'bell'
  },
  color: {
    type: String,
    enum: ['blue', 'green', 'yellow', 'red', 'purple', 'gray'],
    default: 'blue'
  },
  image: String,
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionButton: {
    text: String,
    url: String,
    action: String
  },
  channels: [{
    type: String,
    enum: ['email', 'sms', 'push', 'in_app', 'webhook'],
    default: 'in_app'
  }],
  deliveryStatus: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      opened: { type: Boolean, default: false },
      openedAt: Date,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      clicked: { type: Boolean, default: false },
      clickedAt: Date,
      error: String
    },
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: { type: Date, default: Date.now },
      viewed: { type: Boolean, default: false },
      viewedAt: Date
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  scheduledFor: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  expiresAt: Date,
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  relatedPackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package'
  },
  relatedExperience: String, 
  metadata: {
    campaignId: String,
    groupId: String,
    templateId: String,
    variables: mongoose.Schema.Types.Mixed,
    tags: [String],
    source: String,
    customData: mongoose.Schema.Types.Mixed
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderType: {
    type: String,
    enum: ['system', 'admin', 'automated'],
    default: 'system'
  },
  analytics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    lastInteraction: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, isScheduled: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ 'metadata.campaignId': 1 });
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return 'Vừa xong';
});
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});
notificationSchema.methods.markAsRead = async function(io) {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    this.deliveryStatus.inApp.viewed = true;
    this.deliveryStatus.inApp.viewedAt = new Date();
    await this.save();
    if (io) {
      io.to(`user_${this.recipient}`).emit('notification_read', {
        notificationId: this._id,
        isRead: true
      });
    }
  }
  return this;
};
notificationSchema.methods.trackInteraction = async function(interactionType = 'click') {
  this.analytics.lastInteraction = new Date();
  if (interactionType === 'click') {
    this.analytics.clicks += 1;
  } else if (interactionType === 'impression') {
    this.analytics.impressions += 1;
  } else if (interactionType === 'conversion') {
    this.analytics.conversions += 1;
  }
  await this.save();
  return this;
};
notificationSchema.statics.createAndSend = async function(notificationData, io) {
  const notification = new this(notificationData);
  await notification.save();
  if (io) {
    io.to(`user_${notification.recipient}`).emit('new_notification', {
      notification: notification.toObject(),
      unreadCount: await this.countDocuments({
        recipient: notification.recipient,
        isRead: false
      })
    });
  }
  
  // TODO: Send email, SMS, push notifications based on channels
  
  return notification;
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    unreadOnly = false,
    includeExpired = false
  } = options;
  
  const query = { recipient: userId };
  
  if (type) query.type = type;
  if (unreadOnly) query.isRead = false;
  if (!includeExpired) {
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];
  }
  
  return this.find(query)
    .populate('relatedBooking', 'bookingNumber status')
    .populate('relatedPackage', 'name')
    .populate('sender', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to get notification statistics
notificationSchema.statics.getStats = function(userId) {
  return this.aggregate([
    { $match: { recipient: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
        },
        urgent: {
          $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
        },
        actionRequired: {
          $sum: { $cond: [{ $eq: ['$actionRequired', true] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = async function(userId, io) {
  const result = await this.updateMany(
    { recipient: userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date(),
      'deliveryStatus.inApp.viewed': true,
      'deliveryStatus.inApp.viewedAt': new Date()
    }
  );
  
  // Send real-time update
  if (io) {
    io.to(`user_${userId}`).emit('all_notifications_read', {
      markedCount: result.modifiedCount
    });
  }
  
  return result;
};

// Static method to clean up expired notifications
notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isRead: true
  });
};

module.exports = mongoose.model('Notification', notificationSchema);