const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, access denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error in admin authentication' });
  }
};

// Middleware to check if user is business or admin
const businessAuth = async (req, res, next) => {
  try {
    if (!['business', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Business or admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error in business authentication' });
  }
};

// Middleware to check if user is verified
const verifiedAuth = async (req, res, next) => {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email address first' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error in verification check' });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  auth,
  adminAuth,
  businessAuth,
  verifiedAuth,
  optionalAuth
};