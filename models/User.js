const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['customer', 'business', 'admin'],
    default: 'customer'
  },
  
  // Business specific fields
  businessInfo: {
    companyName: String,
    businessLicense: String,
    logo: String,
    description: String,
    address: String,
    website: String,
    referralCode: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  
  // Reset password
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for bookings
userSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'user'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate referral code for business users
userSchema.pre('save', function(next) {
  if (this.role === 'business' && !this.businessInfo.referralCode) {
    this.businessInfo.referralCode = this.name.replace(/\s+/g, '').toUpperCase() + 
      Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate auth token data
userSchema.methods.toAuthJSON = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    businessInfo: this.businessInfo,
    isVerified: this.isVerified
  };
};

module.exports = mongoose.model('User', userSchema);