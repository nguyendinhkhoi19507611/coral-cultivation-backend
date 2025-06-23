const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // References
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
  
  // Booking details
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
  
  // Pricing
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
  
  // Contact information
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
  
  // Business booking (if applicable)
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
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'growing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Payment
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
  
  // Coral cultivation tracking
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
    }
  },
  
  // Certificate
  certificate: {
    isGenerated: {
      type: Boolean,
      default: false
    },
    certificateUrl: String,
    qrCode: String,
    generatedAt: Date
  },
  
  // Experience bookings
  experienceBookings: [{
    type: {
      type: String,
      enum: ['site_visit', 'diving', 'snorkeling', 'monitoring']
    },
    scheduledDate: Date,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    participants: Number,
    notes: String
  }],
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['booking_confirmed', 'cultivation_started', 'progress_update', 'completed', 'certificate_ready']
    },
    message: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  
  // Cancellation
  cancellation: {
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundProcessedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate booking number
bookingSchema.pre('save', async function(next) {
  if (!this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `CR${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Calculate total amount
bookingSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    let total = this.quantity * this.unitPrice;
    
    // Apply business discount if applicable
    if (this.businessBooking.corporateDiscount > 0) {
      total = total * (1 - this.businessBooking.corporateDiscount / 100);
    }
    
    this.totalAmount = Math.round(total);
  }
  next();
});

// Virtual for progress percentage
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

// Method to add progress update
bookingSchema.methods.addProgressUpdate = function(updateData) {
  this.cultivation.progress.push(updateData);
  return this.save();
};

// Method to generate certificate
bookingSchema.methods.generateCertificate = async function() {
  // This would integrate with certificate generation service
  // For now, just mark as generated
  this.certificate.isGenerated = true;
  this.certificate.generatedAt = new Date();
  return this.save();
};

// Static method to get booking statistics
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

module.exports = mongoose.model('Booking', bookingSchema);