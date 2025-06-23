// backend/routes/admin.js
const express = require('express');
const User = require('../models/User');
const Package = require('../models/Package');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { auth, adminAuth } = require('../middleware/auth');
const { sendBulkEmail } = require('../utils/email');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Admin
router.get('/dashboard', auth, adminAuth, async (req, res) => {
  try {
    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const newUsersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // Package statistics  
    const totalPackages = await Package.countDocuments();
    const activePackages = await Package.countDocuments({ status: 'active' });
    const featuredPackages = await Package.countDocuments({ featured: true });

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const activeBookings = await Booking.countDocuments({
      status: { $in: ['confirmed', 'processing', 'growing'] }
    });
    const bookingsThisMonth = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const bookingsLastMonth = await Booking.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // Revenue statistics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const revenueThisMonth = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const revenueLastMonth = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Review statistics
    const totalReviews = await Review.countDocuments();
    const averageRating = await Review.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    // Recent activities
    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('package', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentUsers = await User.find()
      .select('name email role createdAt isVerified')
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate growth percentages
    const userGrowth = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100).toFixed(1)
      : newUsersThisMonth > 0 ? 100 : 0;

    const bookingGrowth = bookingsLastMonth > 0
      ? ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth * 100).toFixed(1)
      : bookingsThisMonth > 0 ? 100 : 0;

    const revenueGrowth = revenueLastMonth[0]?.revenue > 0
      ? (((revenueThisMonth[0]?.revenue || 0) - revenueLastMonth[0].revenue) / revenueLastMonth[0].revenue * 100).toFixed(1)
      : (revenueThisMonth[0]?.revenue || 0) > 0 ? 100 : 0;

    res.json({
      overview: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth,
          growth: userGrowth
        },
        packages: {
          total: totalPackages,
          active: activePackages,
          featured: featuredPackages
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          active: activeBookings,
          thisMonth: bookingsThisMonth,
          growth: bookingGrowth
        },
        revenue: {
          total: revenueStats[0]?.totalRevenue || 0,
          thisMonth: revenueThisMonth[0]?.revenue || 0,
          averageOrderValue: revenueStats[0]?.averageOrderValue || 0,
          growth: revenueGrowth
        },
        reviews: {
          total: totalReviews,
          averageRating: averageRating[0]?.avgRating || 0
        }
      },
      recentActivities: {
        bookings: recentBookings,
        users: recentUsers
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

// @route   GET /api/admin/analytics/revenue
// @desc    Get revenue analytics
// @access  Admin
router.get('/analytics/revenue', auth, adminAuth, async (req, res) => {
  try {
    const { period = 'month', year = new Date().getFullYear() } = req.query;

    let groupBy, dateFormat;
    let startDate, endDate;

    if (period === 'year') {
      // Group by month for yearly view
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      dateFormat = '%Y-%m';
      startDate = new Date(year, 0, 1);
      endDate = new Date(parseInt(year) + 1, 0, 1);
    } else {
      // Group by day for monthly view
      groupBy = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      dateFormat = '%Y-%m-%d';
      startDate = new Date(year, new Date().getMonth(), 1);
      endDate = new Date(year, new Date().getMonth() + 1, 1);
    }

    const revenueData = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $addFields: {
          date: {
            $dateToString: {
              format: dateFormat,
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day'
                }
              }
            }
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Revenue by package
    const revenueByPackage = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: '$package',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'packages',
          localField: '_id',
          foreignField: '_id',
          as: 'packageInfo'
        }
      },
      {
        $unwind: '$packageInfo'
      },
      {
        $project: {
          packageName: '$packageInfo.name',
          coralType: '$packageInfo.coralType',
          revenue: 1,
          orders: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Revenue by user type
    const revenueByUserType = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate, $lt: endDate }
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
        $unwind: '$userInfo'
      },
      {
        $group: {
          _id: '$userInfo.role',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      timeline: revenueData,
      byPackage: revenueByPackage,
      byUserType: revenueByUserType,
      period,
      year
    });

  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching revenue analytics' });
  }
});

// @route   GET /api/admin/analytics/users
// @desc    Get user analytics
// @access  Admin
router.get('/analytics/users', auth, adminAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // User registration trends
    const registrationTrends = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Users by role
    const usersByRole = await User.aggregate([
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

    // Top customers by spending
    const topCustomers = await Booking.aggregate([
      {
        $match: { paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          role: '$userInfo.role',
          totalSpent: 1,
          totalOrders: 1,
          averageOrderValue: { $divide: ['$totalSpent', '$totalOrders'] }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      registrationTrends,
      usersByRole,
      topCustomers
    });

  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching user analytics' });
  }
});

// @route   GET /api/admin/analytics/packages
// @desc    Get package analytics
// @access  Admin
router.get('/analytics/packages', auth, adminAuth, async (req, res) => {
  try {
    // Package performance
    const packagePerformance = await Package.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'package',
          as: 'bookings'
        }
      },
      {
        $addFields: {
          totalBookings: { $size: '$bookings' },
          totalRevenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$bookings',
                    cond: { $eq: ['$$this.paymentStatus', 'paid'] }
                  }
                },
                as: 'booking',
                in: '$$booking.totalAmount'
              }
            }
          },
          conversionRate: {
            $cond: [
              { $eq: ['$currentBookings', 0] },
              0,
              { $multiply: [{ $divide: ['$totalBookings', '$maxCapacity'] }, 100] }
            ]
          }
        }
      },
      {
        $project: {
          name: 1,
          coralType: 1,
          price: 1,
          status: 1,
          featured: 1,
          totalBookings: 1,
          totalRevenue: 1,
          averageRating: 1,
          reviewCount: 1,
          conversionRate: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Bookings by coral type
    const bookingsByCoralType = await Package.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'package',
          as: 'bookings'
        }
      },
      {
        $group: {
          _id: '$coralType',
          totalBookings: { $sum: { $size: '$bookings' } },
          totalRevenue: {
            $sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$bookings',
                      cond: { $eq: ['$$this.paymentStatus', 'paid'] }
                    }
                  },
                  as: 'booking',
                  in: '$$booking.totalAmount'
                }
              }
            }
          },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      packagePerformance,
      bookingsByCoralType
    });

  } catch (error) {
    console.error('Get package analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching package analytics' });
  }
});

// @route   POST /api/admin/notifications/broadcast
// @desc    Send broadcast notification to users
// @access  Admin
router.post('/notifications/broadcast', auth, adminAuth, async (req, res) => {
  try {
    const { userRole, subject, message, template = 'general' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    // Get users based on role filter
    const filter = {};
    if (userRole && userRole !== 'all') {
      filter.role = userRole;
    }
    filter.isActive = true;

    const users = await User.find(filter).select('name email');

    if (users.length === 0) {
      return res.status(400).json({ message: 'No users found matching criteria' });
    }

    // Send bulk email
    const emailResult = await sendBulkEmail(users, {
      subject,
      template: 'general',
      data: {
        title: subject,
        message,
        actionUrl: process.env.CLIENT_URL
      }
    });

    res.json({
      message: 'Broadcast notification sent successfully',
      recipients: users.length,
      successful: emailResult.successful,
      failed: emailResult.failed
    });

  } catch (error) {
    console.error('Send broadcast notification error:', error);
    res.status(500).json({ message: 'Server error while sending broadcast notification' });
  }
});

// @route   GET /api/admin/export/bookings
// @desc    Export bookings data
// @access  Admin
router.get('/export/bookings', auth, adminAuth, async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = {};
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    const bookings = await Booking.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
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
      {
        $unwind: '$userInfo'
      },
      {
        $unwind: '$packageInfo'
      },
      {
        $project: {
          bookingNumber: 1,
          customerName: '$userInfo.name',
          customerEmail: '$userInfo.email',
          packageName: '$packageInfo.name',
          coralType: '$packageInfo.coralType',
          quantity: 1,
          totalAmount: 1,
          status: 1,
          paymentStatus: 1,
          createdAt: 1,
          'contactInfo.phone': 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    if (format === 'csv') {
      // Convert to CSV format
      const csv = [
        'Booking Number,Customer Name,Customer Email,Package Name,Coral Type,Quantity,Total Amount,Status,Payment Status,Created Date,Phone',
        ...bookings.map(booking => 
          `${booking.bookingNumber},${booking.customerName},${booking.customerEmail},${booking.packageName},${booking.coralType},${booking.quantity},${booking.totalAmount},${booking.status},${booking.paymentStatus},${booking.createdAt.toISOString().split('T')[0]},${booking.contactInfo?.phone || ''}`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings-export.csv"');
      res.send(csv);
    } else {
      res.json({
        data: bookings,
        count: bookings.length,
        exportedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({ message: 'Server error while exporting bookings data' });
  }
});

module.exports = router;