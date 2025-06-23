// backend/routes/users.js
const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadProfile } = require('../middleware/upload');

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  phone: Joi.string(),
  businessInfo: Joi.object({
    companyName: Joi.string(),
    description: Joi.string(),
    address: Joi.string(),
    website: Joi.string().uri()
  }).when('role', {
    is: 'business',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('bookings', 'bookingNumber status totalAmount createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, uploadProfile, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const updateData = { ...value };

    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      updateData.avatar = req.files.avatar[0].path;
    }

    // Handle business logo upload
    if (req.user.role === 'business' && req.files && req.files.logo && req.files.logo[0]) {
      updateData.businessInfo = {
        ...updateData.businessInfo,
        logo: req.files.logo[0].path
      };
    }

    // Handle business license upload
    if (req.user.role === 'business' && req.files && req.files.businessLicense && req.files.businessLicense[0]) {
      updateData.businessInfo = {
        ...updateData.businessInfo,
        businessLicense: req.files.businessLicense[0].path
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   GET /api/users/dashboard-stats
// @desc    Get user dashboard statistics
// @access  Private
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find({ user: userId })
      .populate('package', 'name images coralType location')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate total statistics
    const totalStats = {
      totalBookings: 0,
      totalSpent: 0,
      activeBookings: 0,
      completedBookings: 0
    };

    bookingStats.forEach(stat => {
      totalStats.totalBookings += stat.count;
      totalStats.totalSpent += stat.totalAmount;
      
      if (['confirmed', 'processing', 'growing'].includes(stat._id)) {
        totalStats.activeBookings += stat.count;
      }
      if (stat._id === 'completed') {
        totalStats.completedBookings += stat.count;
      }
    });

    res.json({
      stats: totalStats,
      bookingsByStatus: bookingStats,
      recentBookings
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard statistics' });
  }
});

// @route   GET /api/users/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;

    // Get notifications from bookings
    const matchStage = { user: req.user._id };
    if (unreadOnly === 'true') {
      matchStage['notifications.isRead'] = false;
    }

    const notifications = await Booking.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: '$notifications' },
      ...(unreadOnly === 'true' ? [{ $match: { 'notifications.isRead': false } }] : []),
      {
        $lookup: {
          from: 'packages',
          localField: 'package',
          foreignField: '_id',
          as: 'packageInfo'
        }
      },
      {
        $project: {
          _id: '$notifications._id',
          type: '$notifications.type',
          message: '$notifications.message',
          sentAt: '$notifications.sentAt',
          isRead: '$notifications.isRead',
          bookingNumber: '$bookingNumber',
          packageName: { $arrayElemAt: ['$packageInfo.name', 0] }
        }
      },
      { $sort: { sentAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ]);

    // Get unread count
    const unreadCount = await Booking.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: '$notifications' },
      { $match: { 'notifications.isRead': false } },
      { $count: 'unread' }
    ]);

    res.json({
      notifications,
      unreadCount: unreadCount[0]?.unread || 0,
      pagination: {
        page: Number(page),
        limit: Number(limit)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

// @route   PUT /api/users/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;

    await Booking.updateOne(
      { 
        user: req.user._id,
        'notifications._id': notificationId
      },
      {
        $set: { 'notifications.$.isRead': true }
      }
    );

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error while updating notification' });
  }
});

// @route   PUT /api/users/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Booking.updateMany(
      { user: req.user._id },
      {
        $set: { 'notifications.$[].isRead': true }
      }
    );

    res.json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error while updating notifications' });
  }
});

// ADMIN ROUTES

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Admin
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      isVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { 'businessInfo.companyName': new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(filter);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const bookingStats = await Booking.aggregate([
          { $match: { user: user._id } },
          {
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              totalSpent: { $sum: '$totalAmount' },
              lastBooking: { $max: '$createdAt' }
            }
          }
        ]);

        return {
          ...user.toObject(),
          stats: bookingStats[0] || {
            totalBookings: 0,
            totalSpent: 0,
            lastBooking: null
          }
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (Admin only)
// @access  Admin
router.put('/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { isActive, isVerified } = req.body;
    const userId = req.params.id;

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error while updating user status' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (Admin only)
// @access  Admin
router.get('/admin/stats', auth, adminAuth, async (req, res) => {
  try {
    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Get registration trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const registrationTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      userStats,
      registrationTrends,
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      verifiedUsers: await User.countDocuments({ isVerified: true })
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error while fetching user statistics' });
  }
});

module.exports = router;