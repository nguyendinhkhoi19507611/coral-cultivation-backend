// backend/routes/reviews.js
const express = require('express');
const Joi = require('joi');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');

const router = express.Router();

// Validation schemas
const reviewSchema = Joi.object({
  bookingId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().required().trim().max(100),
  content: Joi.string().required().trim().max(1000),
  detailedRatings: Joi.object({
    serviceQuality: Joi.number().integer().min(1).max(5),
    communication: Joi.number().integer().min(1).max(5),
    value: Joi.number().integer().min(1).max(5),
    experience: Joi.number().integer().min(1).max(5)
  }).optional()
});

const businessResponseSchema = Joi.object({
  content: Joi.string().required().trim().max(500)
});

// @route   GET /api/reviews
// @desc    Get reviews with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      packageId,
      userId,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      moderationStatus = 'approved',
      isPublished = true
    } = req.query;

    // Build filter
    const filter = {
      moderationStatus,
      isPublished: isPublished === 'true'
    };
    
    if (packageId) filter.package = packageId;
    if (userId) filter.user = userId;
    if (rating) filter.rating = Number(rating);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get reviews
    const reviews = await Review.find(filter)
      .populate('user', 'name avatar')
      .populate('package', 'name images coralType')
      .populate('businessResponse.respondedBy', 'name businessInfo.companyName')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching reviews' });
  }
});

// @route   GET /api/reviews/package/:packageId/stats
// @desc    Get package review statistics
// @access  Public
router.get('/package/:packageId/stats', async (req, res) => {
  try {
    const packageId = req.params.packageId;

    const stats = await Review.getPackageStats(packageId);
    
    res.json({
      stats: stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: []
      }
    });

  } catch (error) {
    console.error('Get package review stats error:', error);
    res.status(500).json({ message: 'Server error while fetching review statistics' });
  }
});

// @route   POST /api/reviews
// @desc    Create new review
// @access  Private
router.post('/', auth, uploadImages, async (req, res) => {
  try {
    // Validate input
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { bookingId, rating, title, content, detailedRatings } = value;

    // Verify booking exists and belongs to user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id,
      status: 'completed'
    }).populate('package');

    if (!booking) {
      return res.status(404).json({ 
        message: 'Completed booking not found or does not belong to you' 
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      user: req.user._id,
      package: booking.package._id
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this package' 
      });
    }

    // Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push({
          url: file.path,
          caption: 'Review image'
        });
      });
    }

    // Create review
    const review = new Review({
      user: req.user._id,
      package: booking.package._id,
      booking: bookingId,
      rating,
      title,
      content,
      detailedRatings,
      images,
      isVerified: true // Mark as verified since user completed the booking
    });

    await review.save();

    // Populate review data for response
    await review.populate('user', 'name avatar');
    await review.populate('package', 'name');

    res.status(201).json({
      message: 'Review created successfully',
      review
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error while creating review' });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private (Author only)
router.put('/:id', auth, uploadImages, async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Validate input
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Find review
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Process new images
    let images = review.images;
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: file.path,
        caption: 'Review image'
      }));
      images = [...images, ...newImages];
    }

    // Update review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        ...value,
        images,
        moderationStatus: 'pending' // Reset moderation status after edit
      },
      { new: true, runValidators: true }
    ).populate('user', 'name avatar').populate('package', 'name');

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error while updating review' });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private (Author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const reviewId = req.params.id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check ownership or admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error while deleting review' });
  }
});

// @route   PUT /api/reviews/:id/helpful
// @desc    Mark review as helpful
// @access  Private
router.put('/:id/helpful', auth, async (req, res) => {
  try {
    const reviewId = req.params.id;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({
      message: 'Review marked as helpful',
      helpfulCount: review.helpfulCount
    });

  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({ message: 'Server error while marking review as helpful' });
  }
});

// @route   POST /api/reviews/:id/respond
// @desc    Respond to review (Business/Admin only)
// @access  Private
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Validate input
    const { error, value } = businessResponseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { content } = value;

    // Check if user can respond (business owner or admin)
    if (!['business', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only business owners and admins can respond to reviews' });
    }

    const review = await Review.findById(reviewId).populate('package');
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Update review with business response
    review.businessResponse = {
      content,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };

    await review.save();

    await review.populate('businessResponse.respondedBy', 'name businessInfo.companyName');

    res.json({
      message: 'Response added successfully',
      response: review.businessResponse
    });

  } catch (error) {
    console.error('Add review response error:', error);
    res.status(500).json({ message: 'Server error while adding response' });
  }
});

// ADMIN ROUTES

// @route   GET /api/reviews/admin/pending
// @desc    Get pending reviews for moderation (Admin only)
// @access  Admin
router.get('/admin/pending', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.find({ moderationStatus: 'pending' })
      .populate('user', 'name email avatar')
      .populate('package', 'name')
      .populate('booking', 'bookingNumber')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Review.countDocuments({ moderationStatus: 'pending' });

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ message: 'Server error while fetching pending reviews' });
  }
});

// @route   PUT /api/reviews/:id/moderate
// @desc    Moderate review (Admin only)
// @access  Admin
router.put('/:id/moderate', auth, adminAuth, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { moderationStatus, moderationNote, isPublished } = req.body;

    if (!['approved', 'rejected'].includes(moderationStatus)) {
      return res.status(400).json({ message: 'Invalid moderation status' });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        moderationStatus,
        moderationNote,
        isPublished: moderationStatus === 'approved' ? (isPublished !== false) : false,
        moderatedBy: req.user._id,
        moderatedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({
      message: `Review ${moderationStatus} successfully`,
      review
    });

  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({ message: 'Server error while moderating review' });
  }
});

// @route   GET /api/reviews/admin/stats
// @desc    Get review statistics (Admin only)
// @access  Admin
router.get('/admin/stats', auth, adminAuth, async (req, res) => {
  try {
    // Overall review stats
    const overallStats = await Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          publishedReviews: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Reviews by status
    const statusStats = await Review.aggregate([
      {
        $group: {
          _id: '$moderationStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Reviews by rating
    const ratingStats = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Recent reviews trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const reviewTrends = await Review.aggregate([
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
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      overall: overallStats[0] || {
        totalReviews: 0,
        averageRating: 0,
        publishedReviews: 0
      },
      byStatus: statusStats,
      byRating: ratingStats,
      trends: reviewTrends
    });

  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error while fetching review statistics' });
  }
});

module.exports = router;