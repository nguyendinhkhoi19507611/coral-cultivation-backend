const express = require('express');
const Joi = require('joi');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { generateCertificate } = require('../utils/certificate');

const router = express.Router();

// Validation schema
const bookingSchema = Joi.object({
  packageId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
  contactInfo: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    address: Joi.string().optional(),
    specialRequests: Joi.string().optional()
  }).required(),
  businessBooking: Joi.object({
    isBusinessBooking: Joi.boolean().default(false),
    businessName: Joi.string().when('isBusinessBooking', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    referralCode: Joi.string().optional(),
    groupSize: Joi.number().integer().min(1).optional()
  }).optional(),
  paymentMethod: Joi.string().valid('momo', 'bank_transfer', 'cash').default('momo')
});

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get bookings
    const bookings = await Booking.find(filter)
      .populate('package', 'name images coralType location price')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

// @route   GET /api/bookings/stats
// @desc    Get user's booking statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Booking.getStats(req.user._id);
    
    const summary = {
      total: 0,
      pending: 0,
      confirmed: 0,
      growing: 0,
      completed: 0,
      cancelled: 0,
      totalSpent: 0
    };

    stats.forEach(stat => {
      summary.total += stat.count;
      summary[stat._id] = stat.count;
      summary.totalSpent += stat.totalAmount;
    });

    res.json({ stats: summary });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('package')
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns this booking or is admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ booking });

  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching booking' });
  }
});

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    // Validate input
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { packageId, quantity, contactInfo, businessBooking, paymentMethod } = value;

    // Find package
    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Check availability
    if (package.status !== 'active') {
      return res.status(400).json({ message: 'Package is not available for booking' });
    }

    if (package.currentBookings + quantity > package.maxCapacity) {
      return res.status(400).json({ message: 'Not enough capacity available' });
    }

    // Check dates
    const now = new Date();
    if (package.availableFrom > now || package.availableTo < now) {
      return res.status(400).json({ message: 'Package is not available for the selected dates' });
    }

    // Calculate pricing
    let unitPrice = package.price;
    let corporateDiscount = 0;

    // Apply business discount if applicable
    if (businessBooking?.isBusinessBooking && businessBooking.referralCode) {
      const business = await User.findOne({
        'businessInfo.referralCode': businessBooking.referralCode,
        role: 'business'
      });
      
      if (business) {
        corporateDiscount = 10; // 10% discount for business bookings
      }
    }

    // Create booking
    const booking = new Booking({
      user: req.user._id,
      package: packageId,
      quantity,
      unitPrice,
      contactInfo,
      businessBooking: {
        ...businessBooking,
        corporateDiscount
      },
      paymentMethod,
      cultivation: {
        estimatedCompletionDate: new Date(Date.now() + package.duration * 30 * 24 * 60 * 60 * 1000)
      }
    });

    await booking.save();

    // Update package booking count
    package.currentBookings += quantity;
    package.totalBookings += quantity;
    await package.save();

    // Send confirmation email
    await sendEmail({
      to: contactInfo.email,
      subject: 'Booking Confirmation - Coral Cultivation',
      template: 'bookingConfirmation',
      data: {
        name: contactInfo.name,
        bookingNumber: booking.bookingNumber,
        packageName: package.name,
        quantity,
        totalAmount: booking.totalAmount,
        estimatedCompletion: booking.cultivation.estimatedCompletionDate
      }
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: await booking.populate('package', 'name images')
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error while creating booking' });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id).populate('package');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check ownership
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if cancellation is allowed
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot cancel booking in current status' });
    }

    // Calculate refund amount (example: full refund if cancelled before cultivation starts)
    let refundAmount = 0;
    if (booking.status === 'pending') {
      refundAmount = booking.totalAmount;
    } else if (booking.status === 'confirmed') {
      refundAmount = booking.totalAmount * 0.8; // 80% refund
    }

    // Update booking
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: reason || 'Cancelled by user',
      cancelledAt: new Date(),
      refundAmount
    };
    await booking.save();

    // Update package capacity
    booking.package.currentBookings -= booking.quantity;
    await booking.package.save();

    // Send cancellation email
    await sendEmail({
      to: booking.contactInfo.email,
      subject: 'Booking Cancellation - Coral Cultivation',
      template: 'bookingCancellation',
      data: {
        name: booking.contactInfo.name,
        bookingNumber: booking.bookingNumber,
        refundAmount,
        reason: booking.cancellation.reason
      }
    });

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error while cancelling booking' });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status (Admin only)
// @access  Admin
router.put('/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'growing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id).populate('package user');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const oldStatus = booking.status;
    booking.status = status;

    // Handle status-specific updates
    if (status === 'confirmed' && oldStatus === 'pending') {
      booking.paymentStatus = 'paid';
      booking.paidAt = new Date();
    }

    if (status === 'processing' && !booking.cultivation.startDate) {
      booking.cultivation.startDate = new Date();
      booking.cultivation.location = booking.package.location;
    }

    if (status === 'completed' && !booking.cultivation.actualCompletionDate) {
      booking.cultivation.actualCompletionDate = new Date();
      
      // Generate certificate
      if (!booking.certificate.isGenerated) {
        await booking.generateCertificate();
      }
    }

    // Add progress update
    if (notes) {
      booking.cultivation.progress.push({
        status,
        description: notes,
        reportedBy: req.user._id
      });
    }

    await booking.save();

    // Send status update email
    const statusMessages = {
      confirmed: 'Your coral cultivation booking has been confirmed!',
      processing: 'Your coral cultivation has begun!',
      growing: 'Your coral is growing beautifully!',
      completed: 'Your coral cultivation is complete!'
    };

    if (statusMessages[status]) {
      await sendEmail({
        to: booking.contactInfo.email,
        subject: `Booking Update - ${statusMessages[status]}`,
        template: 'statusUpdate',
        data: {
          name: booking.contactInfo.name,
          bookingNumber: booking.bookingNumber,
          status,
          message: statusMessages[status],
          notes
        }
      });
    }

    res.json({
      message: 'Booking status updated successfully',
      booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error while updating booking status' });
  }
});

// @route   POST /api/bookings/:id/progress
// @desc    Add progress update (Admin only)
// @access  Admin
router.post('/:id/progress', auth, adminAuth, async (req, res) => {
  try {
    const { description, images } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const progressUpdate = {
      status: booking.status,
      description,
      images: images || [],
      reportedBy: req.user._id
    };

    booking.cultivation.progress.push(progressUpdate);
    await booking.save();

    // Send progress update email
    await sendEmail({
      to: booking.contactInfo.email,
      subject: 'Coral Growth Progress Update',
      template: 'progressUpdate',
      data: {
        name: booking.contactInfo.name,
        bookingNumber: booking.bookingNumber,
        description,
        images
      }
    });

    res.json({
      message: 'Progress update added successfully',
      update: progressUpdate
    });

  } catch (error) {
    console.error('Add progress update error:', error);
    res.status(500).json({ message: 'Server error while adding progress update' });
  }
});

// @route   GET /api/bookings/:id/certificate
// @desc    Get or generate booking certificate
// @access  Private
router.get('/:id/certificate', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('package', 'name coralType location')
      .populate('user', 'name');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check ownership
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Certificate only available for completed bookings' });
    }

    // Generate certificate if not already generated
    if (!booking.certificate.isGenerated) {
      const certificateData = await generateCertificate({
        bookingNumber: booking.bookingNumber,
        recipientName: booking.contactInfo.name,
        packageName: booking.package.name,
        coralType: booking.package.coralType,
        location: booking.package.location.name,
        completionDate: booking.cultivation.actualCompletionDate,
        quantity: booking.quantity
      });

      booking.certificate.certificateUrl = certificateData.url;
      booking.certificate.qrCode = certificateData.qrCode;
      booking.certificate.isGenerated = true;
      booking.certificate.generatedAt = new Date();
      
      await booking.save();
    }

    res.json({
      certificate: {
        url: booking.certificate.certificateUrl,
        qrCode: booking.certificate.qrCode,
        generatedAt: booking.certificate.generatedAt
      }
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ message: 'Server error while generating certificate' });
  }
});

module.exports = router;