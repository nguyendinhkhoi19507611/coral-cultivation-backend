const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // Coral details
  coralType: {
    type: String,
    required: true,
    enum: ['Staghorn', 'Brain', 'Elkhorn', 'Pillar', 'Table', 'Soft', 'Mixed']
  },
  coralSpecies: {
    type: String,
    required: true
  },
  
  // Location
  location: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    depth: {
      type: String,
      required: true
    },
    waterTemperature: String,
    visibility: String
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'VND'
  },
  
  // Package details
  duration: {
    type: Number, // in months
    required: true,
    min: 1
  },
  maxCapacity: {
    type: Number,
    default: 100
  },
  currentBookings: {
    type: Number,
    default: 0
  },
  
  // Media
  images: [{
    url: String,
    caption: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: String,
    title: String,
    thumbnail: String
  }],
  
  // Features & Benefits
  features: [String],
  benefits: [String],
  
  // Certificate details
  certificateTemplate: String,
  qrCodeEnabled: {
    type: Boolean,
    default: true
  },
  
  // Availability
  availableFrom: {
    type: Date,
    required: true
  },
  availableTo: {
    type: Date,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'soldOut'],
    default: 'active'
  },
  
  // SEO
  slug: {
    type: String,
    unique: true
  },
  metaTitle: String,
  metaDescription: String,
  
  // Admin fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate slug from name
packageSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  next();
});

// Virtual for availability
packageSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.availableFrom <= now && 
         this.availableTo >= now &&
         this.currentBookings < this.maxCapacity;
});

// Virtual for bookings
packageSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'package'
});

// Virtual for reviews
packageSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'package'
});

// Method to get main image
packageSchema.methods.getMainImage = function() {
  const mainImage = this.images.find(img => img.isMain);
  return mainImage ? mainImage.url : (this.images[0] ? this.images[0].url : null);
};

// Static method to get featured packages
packageSchema.statics.getFeatured = function() {
  return this.find({ featured: true, status: 'active' })
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(6);
};

module.exports = mongoose.model('Package', packageSchema);