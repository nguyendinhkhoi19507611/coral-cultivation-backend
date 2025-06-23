const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  bookingNumber: {
    type: String,
    unique: true,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'VND'
  },
  contactInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: String,
    specialRequests: String
  },
  businessBooking: {
    isBusinessBooking: {
      type: Boolean,
      default: false
    },
    businessName: String,
    referralCode: String,
    groupSize: Number,
    corporateDiscount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'growing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['momo', 'bank_transfer', 'cash'],
    default: 'momo'
  },
  paymentId: String,
  transactionId: String,
  paidAt: Date,
  cultivation: {
    startDate: Date,
    estimatedCompletionDate: Date,
    actualCompletionDate: Date,
    location: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    progress: [{
      date: {
        type: Date,
        default: Date.now
      },
      status: String,
      description: String,
      images: [String],
      videos: [String],
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    finalReport: {
      completionDate: Date,
      finalImages: [String],
      finalVideo: String,
      growthData: {
        initialSize: Number,
        finalSize: Number,
        growthRate: Number,
        healthScore: Number
      },
      environmentalImpact: String,
      notes: String
    },
    environmentalData: {
      waterTemperature: [{
        date: Date,
        value: Number,
        unit: String
      }],
      phLevel: [{
        date: Date,
        value: Number
      }],
      visibility: [{
        date: Date,
        value: Number,
        unit: String
      }],
      marineLifeCount: [{
        date: Date,
        species: String,
        count: Number
      }]
    }
  },
  experienceBookings: [{
    type: {
      type: String,
      enum: ['site_visit', 'diving', 'snorkeling', 'monitoring', 'photography', 'education_tour'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    scheduledDate: {
      type: Date,
      required: true
    },
    duration: {
      hours: {
        type: Number,
        default: 2
      },
      minutes: {
        type: Number,
        default: 0
      }
    },
    maxParticipants: {
      type: Number,
      default: 10
    },
    currentParticipants: {
      type: Number,
      default: 0
    },
    participants: [{
      name: String,
      email: String,
      phone: String,
      age: Number,
      divingLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'professional']
      },
      medicalConditions: String
    }],
    location: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      meetingPoint: String,
      transportation: String
    },
    equipment: [{
      item: String,
      quantity: Number,
      provided: Boolean
    }],
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled'
    },
    price: {
      type: Number,
      default: 0
    },
    weatherConditions: {
      description: String,
      windSpeed: Number,
      waveHeight: Number,
      visibility: Number,
      temperature: Number
    },
    safetyBriefing: {
      completed: {
        type: Boolean,
        default: false
      },
      briefingBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      briefingDate: Date,
      emergencyProcedures: String
    },
    experiencePhotos: [String],
    experienceVideos: [String],
    feedback: [{
      participant: String,
      rating: Number,
      comments: String,
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }],
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  certificate: {
    isGenerated: {
      type: Boolean,
      default: false
    },
    certificateUrl: String,
    qrCode: String,
    generatedAt: Date,
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  notifications: [{
    type: {
      type: String,
      enum: [
        'booking_confirmed', 
        'cultivation_started', 
        'progress_update', 
        'completed', 
        'certificate_ready',
        'experience_scheduled',
        'experience_reminder',
        'experience_completed',
        'weather_alert',
        'payment_reminder',
        'custom'
      ]
    },
    title: String,
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    actionRequired: Boolean,
    actionUrl: String,
    expiresAt: Date,
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in_app']
    }],
    metadata: {
      experienceId: String,
      progressUpdateId: String,
      imageUrls: [String],
      videoUrls: [String]
    }
  }],
  cancellation: {
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundProcessedAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  realTimeData: {
    lastUpdate: Date,
    isLive: {
      type: Boolean,
      default: false
    },
    liveStreamUrl: String,
    sensors: [{
      type: String,
      value: mongoose.Schema.Types.Mixed,
      timestamp: Date,
      unit: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ 'experienceBookings.scheduledDate': 1 });
bookingSchema.index({ 'notifications.isRead': 1, 'notifications.sentAt': -1 });
bookingSchema.pre('save', async function(next) {
  if (!this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `CR${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
bookingSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    let total = this.quantity * this.unitPrice;
    if (this.businessBooking.corporateDiscount > 0) {
      total = total * (1 - this.businessBooking.corporateDiscount / 100);
    }
    this.totalAmount = Math.round(total);
  }
  next();
});
bookingSchema.virtual('progressPercentage').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'cancelled') return 0;
  const statusMap = {
    pending: 10,
    confirmed: 20,
    processing: 30,
    growing: 70,
    completed: 100
  };
  return statusMap[this.status] || 0;
});
bookingSchema.virtual('unreadNotificationsCount').get(function() {
  return this.notifications.filter(n => !n.isRead).length;
});
bookingSchema.virtual('nextExperience').get(function() {
  const upcoming = this.experienceBookings
    .filter(exp => exp.status === 'scheduled' && exp.scheduledDate > new Date())
    .sort((a, b) => a.scheduledDate - b.scheduledDate);
  
  return upcoming[0] || null;
});
bookingSchema.methods.addProgressUpdate = async function(updateData, io) {
  this.cultivation.progress.push(updateData);
  const notification = {
    type: 'progress_update',
    title: 'Cập nhật tiến độ san hô',
    message: updateData.description,
    metadata: {
      progressUpdateId: this.cultivation.progress[this.cultivation.progress.length - 1]._id,
      imageUrls: updateData.images || [],
      videoUrls: updateData.videos || []
    }
  };
  this.notifications.push(notification);
  await this.save();
  if (io) {
    io.to(`user_${this.user}`).emit('progress_update', {
      bookingId: this._id,
      bookingNumber: this.bookingNumber,
      update: updateData,
      notification: notification
    });
  }
  return this;
};
bookingSchema.methods.scheduleExperience = async function(experienceData, io) {
  this.experienceBookings.push(experienceData);
  const notification = {
    type: 'experience_scheduled',
    title: 'Trải nghiệm đã được lên lịch',
    message: `Trải nghiệm "${experienceData.title}" đã được lên lịch vào ngày ${experienceData.scheduledDate.toLocaleDateString('vi-VN')}`,
    actionRequired: true,
    actionUrl: `/experiences/${this.experienceBookings[this.experienceBookings.length - 1]._id}`,
    metadata: {
      experienceId: this.experienceBookings[this.experienceBookings.length - 1]._id
    }
  };
  this.notifications.push(notification);
  await this.save();
  if (io) {
    io.to(`user_${this.user}`).emit('experience_scheduled', {
      bookingId: this._id,
      experience: experienceData,
      notification: notification
    });
  }
  return this;
};
bookingSchema.methods.markNotificationRead = async function(notificationId, io) {
  const notification = this.notifications.id(notificationId);
  if (notification) {
    notification.isRead = true;
    notification.readAt = new Date();
    await this.save();
    if (io) {
      io.to(`user_${this.user}`).emit('notification_read', {
        notificationId,
        bookingId: this._id
      });
    }
  }
  return this;
};
bookingSchema.methods.generateCertificate = async function() {
  this.certificate.isGenerated = true;
  this.certificate.generatedAt = new Date();
  return this.save();
};
bookingSchema.statics.getStats = function(userId = null) {
  const match = userId ? { user: userId } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};
bookingSchema.statics.getUpcomingExperiences = function(daysAhead = 7) {
  const startDate = new Date();
  const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return this.aggregate([
    {
      $match: {
        'experienceBookings.scheduledDate': {
          $gte: startDate,
          $lte: endDate
        },
        'experienceBookings.status': 'scheduled'
      }
    },
    { $unwind: '$experienceBookings' },
    {
      $match: {
        'experienceBookings.scheduledDate': {
          $gte: startDate,
          $lte: endDate
        },
        'experienceBookings.status': 'scheduled'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $lookup: {
        from: 'packages',
        localField: 'package',
        foreignField: '_id',
        as: 'packageInfo'
      }
    },
    { $sort: { 'experienceBookings.scheduledDate': 1 } }
  ]);
};
module.exports = mongoose.model('Booking', bookingSchema);