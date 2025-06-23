const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  
  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Review content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Detailed ratings
  detailedRatings: {
    serviceQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    },
    experience: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Media
  images: [{
    url: String,
    caption: String
  }],
  
  // Review metadata
  isVerified: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  
  // Admin moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationNote: String,
  
  // Response from business (if applicable)
  businessResponse: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ package: 1, rating: -1 });
reviewSchema.index({ user: 1, package: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

// Update package average rating after save
reviewSchema.post('save', async function() {
  const Package = mongoose.model('Package');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { package: this.package, isPublished: true, moderationStatus: 'approved' } },
    {
      $group: {
        _id: '$package',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Package.findByIdAndUpdate(this.package, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount
    });
  }
});

// Update package average rating after remove
reviewSchema.post('remove', async function() {
  const Package = mongoose.model('Package');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { package: this.package, isPublished: true, moderationStatus: 'approved' } },
    {
      $group: {
        _id: '$package',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);
  
  const averageRating = stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0;
  const reviewCount = stats.length > 0 ? stats[0].reviewCount : 0;
  
  await Package.findByIdAndUpdate(this.package, {
    averageRating,
    reviewCount
  });
});

// Virtual for user info
reviewSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Method to calculate overall rating from detailed ratings
reviewSchema.methods.calculateOverallRating = function() {
  const { serviceQuality, communication, value, experience } = this.detailedRatings;
  const ratings = [serviceQuality, communication, value, experience].filter(r => r);
  
  if (ratings.length === 0) return this.rating;
  
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return Math.round(average * 10) / 10;
};

// Static method to get package review statistics
reviewSchema.statics.getPackageStats = function(packageId) {
  return this.aggregate([
    { 
      $match: { 
        package: mongoose.Types.ObjectId(packageId),
        isPublished: true,
        moderationStatus: 'approved'
      } 
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$_id' },
        totalReviews: { $sum: '$count' },
        ratingDistribution: {
          $push: {
            rating: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Review', reviewSchema);