// routes/experiences.js
const express = require('express');
const Joi = require('joi');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, adminAuth, businessAuth } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');

const router = express.Router();

// Validation schemas
const experienceSchema = Joi.object({
  type: Joi.string().valid('site_visit', 'diving', 'snorkeling', 'monitoring', 'photography', 'education_tour').required(),
  title: Joi.string().required().min(5).max(100),
  description: Joi.string().max(500),
  scheduledDate: Joi.date().min('now').required(),
  duration: Joi.object({
    hours: Joi.number().min(0).max(24).default(2),
    minutes: Joi.number().min(0).max(59).default(0)
  }),
  maxParticipants: Joi.number().min(1).max(50).default(10),
  location: Joi.object({
    name: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }),
    meetingPoint: Joi.string(),
    transportation: Joi.string()
  }).required(),
  equipment: Joi.array().items(Joi.object({
    item: Joi.string().required(),
    quantity: Joi.number().min(1),
    provided: Joi.boolean().default(true)
  })),
  price: Joi.number().min(0).default(0),
  guideId: Joi.string().optional(),
  safetyRequirements: Joi.string(),
  weatherRequirements: Joi.string()
});

const participantSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  age: Joi.number().min(8).max(100).required(),
  divingLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'professional'),
  medicalConditions: Joi.string(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    relationship: Joi.string().required()
  }).required()
});

// @route   GET /api/experiences
// @desc    Get all experiences with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      location,
      startDate,
      endDate,
      status = 'scheduled',
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = req.query;

    // Build aggregation pipeline
    const pipeline = [
      { $unwind: '$experienceBookings' },
      {
        $match: {
          'experienceBookings.status': status
        }
      }
    ];

    // Add filters
    if (type) {
      pipeline.push({
        $match: { 'experienceBookings.type': type }
      });
    }

    if (location) {
      pipeline.push({
        $match: { 'experienceBookings.location.name': new RegExp(location, 'i') }
      });
    }

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      pipeline.push({
        $match: { 'experienceBookings.scheduledDate': dateFilter }
      });
    }

    // Add lookup for booking and user info
    pipeline.push(
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
        $lookup: {
          from: 'users',
          localField: 'experienceBookings.guide',
          foreignField: '_id',
          as: 'guideInfo'
        }
      }
    );

    // Project fields
    pipeline.push({
      $project: {
        bookingId: '$_id',
        bookingNumber: 1,
        experience: '$experienceBookings',
        user: { $arrayElemAt: ['$userInfo', 0] },
        package: { $arrayElemAt: ['$packageInfo', 0] },
        guide: { $arrayElemAt: ['$guideInfo', 0] }
      }
    });

    // Sort
    const sortOptions = {};
    sortOptions[`experience.${sortBy}`] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortOptions });

    // Pagination
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    const experiences = await Booking.aggregate(pipeline);

    // Get total count
    const totalPipeline = [...pipeline.slice(0, -2)];
    totalPipeline.push({ $count: 'total' });
    const totalResult = await Booking.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      experiences,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get experiences error:', error);
    res.status(500).json({ message: 'Server error while fetching experiences' });
  }
});

// @route   GET /api/experiences/my
// @desc    Get user's experiences
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const { status, upcoming = false } = req.query;

    const match = { user: req.user._id };
    if (status) {
      match['experienceBookings.status'] = status;
    }

    if (upcoming === 'true') {
      match['experienceBookings.scheduledDate'] = { $gte: new Date() };
    }

    const bookings = await Booking.find(match)
      .populate('package', 'name location images')
      .sort({ 'experienceBookings.scheduledDate': 1 });

    // Flatten experiences
    const experiences = [];
    bookings.forEach(booking => {
      booking.experienceBookings.forEach(exp => {
        if (!status || exp.status === status) {
          if (!upcoming || exp.scheduledDate >= new Date()) {
            experiences.push({
              bookingId: booking._id,
              bookingNumber: booking.bookingNumber,
              package: booking.package,
              experience: exp
            });
          }
        }
      });
    });

    res.json({ experiences });

  } catch (error) {
    console.error('Get my experiences error:', error);
    res.status(500).json({ message: 'Server error while fetching your experiences' });
  }
});

// @route   POST /api/experiences/:bookingId
// @desc    Add experience to booking
// @access  Admin
router.post('/:bookingId', auth, adminAuth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Validate input
    const { error, value } = experienceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const booking = await Booking.findById(bookingId).populate('user package');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking is in valid status
    if (!['confirmed', 'processing', 'growing'].includes(booking.status)) {
      return res.status(400).json({ 
        message: 'Cannot add experience to booking in current status' 
      });
    }

    // Validate guide if provided
    if (value.guideId) {
      const guide = await User.findById(value.guideId);
      if (!guide || !['admin', 'business'].includes(guide.role)) {
        return res.status(400).json({ message: 'Invalid guide selected' });
      }
    }

    // Create experience
    const experienceData = {
      ...value,
      guide: value.guideId || req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add experience to booking using the enhanced method
    await booking.scheduleExperience(experienceData, req.io);

    res.status(201).json({
      message: 'Experience scheduled successfully',
      experience: booking.experienceBookings[booking.experienceBookings.length - 1]
    });

  } catch (error) {
    console.error('Add experience error:', error);
    res.status(500).json({ message: 'Server error while scheduling experience' });
  }
});

// @route   PUT /api/experiences/:bookingId/:experienceId
// @desc    Update experience
// @access  Admin
router.put('/:bookingId/:experienceId', auth, adminAuth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    // Validate input
    const { error, value } = experienceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Update experience
    Object.assign(experience, value);
    experience.updatedAt = new Date();

    await booking.save();

    // Send real-time update if socket.io is available
    if (req.io) {
      req.io.sendExperienceUpdate(bookingId, experienceId, {
        type: 'experience_updated',
        data: experience,
        updatedBy: req.user.name
      });
    }

    // Send notification to booking owner
    await Notification.createAndSend({
      recipient: booking.user,
      type: 'experience_update',
      title: 'Cập nhật trải nghiệm',
      message: `Trải nghiệm "${experience.title}" đã được cập nhật`,
      priority: 'medium',
      relatedBooking: bookingId,
      relatedExperience: experienceId,
      actionButton: {
        text: 'Xem chi tiết',
        url: `/experiences/${experienceId}`
      }
    }, req.io);

    res.json({
      message: 'Experience updated successfully',
      experience
    });

  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({ message: 'Server error while updating experience' });
  }
});

// @route   DELETE /api/experiences/:bookingId/:experienceId
// @desc    Cancel experience
// @access  Admin
router.delete('/:bookingId/:experienceId', auth, adminAuth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId).populate('user');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    // Check if experience can be cancelled
    if (!['scheduled', 'postponed'].includes(experience.status)) {
      return res.status(400).json({ 
        message: 'Cannot cancel experience in current status' 
      });
    }

    // Update experience status
    experience.status = 'cancelled';
    experience.notes = reason || 'Cancelled by admin';
    experience.updatedAt = new Date();

    await booking.save();

    // Send notification to participants
    await Notification.createAndSend({
      recipient: booking.user._id,
      type: 'experience_cancelled',
      title: '❌ Trải nghiệm bị hủy',
      message: `Trải nghiệm "${experience.title}" đã bị hủy. ${reason || ''}`,
      priority: 'high',
      relatedBooking: bookingId,
      relatedExperience: experienceId
    }, req.io);

    // Send real-time update
    if (req.io) {
      req.io.sendExperienceUpdate(bookingId, experienceId, {
        type: 'experience_cancelled',
        reason,
        cancelledBy: req.user.name
      });
    }

    res.json({
      message: 'Experience cancelled successfully',
      experience
    });

  } catch (error) {
    console.error('Cancel experience error:', error);
    res.status(500).json({ message: 'Server error while cancelling experience' });
  }
});

// @route   POST /api/experiences/:bookingId/:experienceId/join
// @desc    Join experience as participant
// @access  Private
router.post('/:bookingId/:experienceId/join', auth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;

    // Validate participant data
    const { error, value } = participantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    // Check if experience is available for joining
    if (experience.status !== 'scheduled') {
      return res.status(400).json({ 
        message: 'Experience is not available for joining' 
      });
    }

    // Check capacity
    if (experience.currentParticipants >= experience.maxParticipants) {
      return res.status(400).json({ 
        message: 'Experience is fully booked' 
      });
    }

    // Check if user already joined
    const existingParticipant = experience.participants.find(
      p => p.email === value.email
    );
    
    if (existingParticipant) {
      return res.status(400).json({ 
        message: 'You have already joined this experience' 
      });
    }

    // Add participant
    experience.participants.push(value);
    experience.currentParticipants += 1;
    experience.updatedAt = new Date();

    await booking.save();

    // Send confirmation notification
    await Notification.createAndSend({
      recipient: req.user._id,
      type: 'experience_joined',
      title: '✅ Đã tham gia trải nghiệm',
      message: `Bạn đã đăng ký thành công trải nghiệm "${experience.title}"`,
      priority: 'medium',
      relatedBooking: bookingId,
      relatedExperience: experienceId,
      actionButton: {
        text: 'Xem chi tiết',
        url: `/experiences/${experienceId}`
      }
    }, req.io);

    // Notify experience guide
    if (experience.guide) {
      await Notification.createAndSend({
        recipient: experience.guide,
        type: 'participant_joined',
        title: 'Người tham gia mới',
        message: `${value.name} đã tham gia trải nghiệm "${experience.title}"`,
        priority: 'low',
        relatedBooking: bookingId,
        relatedExperience: experienceId
      }, req.io);
    }

    res.json({
      message: 'Successfully joined experience',
      participant: value,
      currentParticipants: experience.currentParticipants
    });

  } catch (error) {
    console.error('Join experience error:', error);
    res.status(500).json({ message: 'Server error while joining experience' });
  }
});

// @route   POST /api/experiences/:bookingId/:experienceId/safety-briefing
// @desc    Complete safety briefing
// @access  Admin/Guide
router.post('/:bookingId/:experienceId/safety-briefing', auth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;
    const { emergencyProcedures, notes } = req.body;

    if (!['admin', 'business'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only guides can complete safety briefings' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    // Update safety briefing
    experience.safetyBriefing = {
      completed: true,
      briefingBy: req.user._id,
      briefingDate: new Date(),
      emergencyProcedures: emergencyProcedures || 'Standard emergency procedures completed',
      notes: notes
    };

    experience.updatedAt = new Date();
    await booking.save();

    // Notify participants
    for (const participant of experience.participants) {
      await Notification.createAndSend({
        recipient: booking.user._id, // Assuming booking owner gets notifications
        type: 'safety_briefing_completed',
        title: '🛡️ Tập huấn an toàn hoàn tất',
        message: `Tập huấn an toàn cho trải nghiệm "${experience.title}" đã hoàn tất`,
        priority: 'medium',
        relatedBooking: bookingId,
        relatedExperience: experienceId
      }, req.io);
    }

    res.json({
      message: 'Safety briefing completed successfully',
      safetyBriefing: experience.safetyBriefing
    });

  } catch (error) {
    console.error('Complete safety briefing error:', error);
    res.status(500).json({ message: 'Server error while completing safety briefing' });
  }
});

// @route   POST /api/experiences/:bookingId/:experienceId/start
// @desc    Start experience
// @access  Admin/Guide
router.post('/:bookingId/:experienceId/start', auth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;
    const { weatherConditions, actualStartTime } = req.body;

    if (!['admin', 'business'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only guides can start experiences' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    // Check if safety briefing is completed
    if (!experience.safetyBriefing.completed) {
      return res.status(400).json({ 
        message: 'Safety briefing must be completed before starting experience' 
      });
    }

    // Update experience status
    experience.status = 'in_progress';
    experience.actualStartTime = actualStartTime || new Date();
    
    if (weatherConditions) {
      experience.weatherConditions = weatherConditions;
    }

    experience.updatedAt = new Date();
    await booking.save();

    // Send real-time update
    if (req.io) {
      req.io.sendExperienceUpdate(bookingId, experienceId, {
        type: 'experience_started',
        startedBy: req.user.name,
        startTime: experience.actualStartTime
      });
    }

    // Notify participants
    await Notification.createAndSend({
      recipient: booking.user._id,
      type: 'experience_started',
      title: '🚀 Trải nghiệm bắt đầu',
      message: `Trải nghiệm "${experience.title}" đã bắt đầu`,
      priority: 'medium',
      relatedBooking: bookingId,
      relatedExperience: experienceId
    }, req.io);

    res.json({
      message: 'Experience started successfully',
      experience: {
        status: experience.status,
        actualStartTime: experience.actualStartTime,
        weatherConditions: experience.weatherConditions
      }
    });

  } catch (error) {
    console.error('Start experience error:', error);
    res.status(500).json({ message: 'Server error while starting experience' });
  }
});

// @route   POST /api/experiences/:bookingId/:experienceId/complete
// @desc    Complete experience
// @access  Admin/Guide
router.post('/:bookingId/:experienceId/complete', auth, uploadImages, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;
    const { summary, highlights, recommendations } = req.body;

    if (!['admin', 'business'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only guides can complete experiences' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    if (experience.status !== 'in_progress') {
      return res.status(400).json({ 
        message: 'Experience must be in progress to be completed' 
      });
    }

    // Process uploaded media
    const photos = [];
    const videos = [];
    
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.mimetype.startsWith('image/')) {
          photos.push(file.path);
        } else if (file.mimetype.startsWith('video/')) {
          videos.push(file.path);
        }
      });
    }

    // Update experience
    experience.status = 'completed';
    experience.actualEndTime = new Date();
    experience.experiencePhotos = [...(experience.experiencePhotos || []), ...photos];
    experience.experienceVideos = [...(experience.experienceVideos || []), ...videos];
    experience.completionSummary = {
      summary: summary || 'Experience completed successfully',
      highlights: highlights || [],
      recommendations: recommendations || '',
      completedBy: req.user._id,
      completedAt: new Date()
    };
    experience.updatedAt = new Date();

    await booking.save();

    // Send completion notification
    await Notification.createAndSend({
      recipient: booking.user._id,
      type: 'experience_completed',
      title: '🎉 Trải nghiệm hoàn thành',
      message: `Trải nghiệm "${experience.title}" đã hoàn thành thành công!`,
      priority: 'medium',
      relatedBooking: bookingId,
      relatedExperience: experienceId,
      actionButton: {
        text: 'Xem ảnh & video',
        url: `/experiences/${experienceId}/media`
      },
      metadata: {
        photos: photos,
        videos: videos
      }
    }, req.io);

    // Send real-time update
    if (req.io) {
      req.io.sendExperienceUpdate(bookingId, experienceId, {
        type: 'experience_completed',
        completedBy: req.user.name,
        endTime: experience.actualEndTime,
        media: { photos, videos }
      });
    }

    res.json({
      message: 'Experience completed successfully',
      experience: {
        status: experience.status,
        actualEndTime: experience.actualEndTime,
        photos: experience.experiencePhotos,
        videos: experience.experienceVideos,
        summary: experience.completionSummary
      }
    });

  } catch (error) {
    console.error('Complete experience error:', error);
    res.status(500).json({ message: 'Server error while completing experience' });
  }
});

// @route   POST /api/experiences/:bookingId/:experienceId/feedback
// @desc    Submit experience feedback
// @access  Private
router.post('/:bookingId/:experienceId/feedback', auth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;
    const { rating, comments, participant } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    if (experience.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Can only provide feedback for completed experiences' 
      });
    }

    // Add feedback
    experience.feedback.push({
      participant: participant || req.user.name,
      rating,
      comments: comments || '',
      submittedAt: new Date()
    });

    experience.updatedAt = new Date();
    await booking.save();

    // Calculate average rating
    const avgRating = experience.feedback.reduce((sum, f) => sum + f.rating, 0) / experience.feedback.length;

    // Notify guide about feedback
    if (experience.guide) {
      await Notification.createAndSend({
        recipient: experience.guide,
        type: 'experience_feedback',
        title: '⭐ Phản hồi trải nghiệm mới',
        message: `Nhận được phản hồi ${rating} sao cho trải nghiệm "${experience.title}"`,
        priority: 'low',
        relatedBooking: bookingId,
        relatedExperience: experienceId,
        metadata: {
          rating,
          averageRating: avgRating,
          totalFeedbacks: experience.feedback.length
        }
      }, req.io);
    }

    res.json({
      message: 'Feedback submitted successfully',
      feedback: experience.feedback[experience.feedback.length - 1],
      averageRating: avgRating,
      totalFeedbacks: experience.feedback.length
    });

  } catch (error) {
    console.error('Submit experience feedback error:', error);
    res.status(500).json({ message: 'Server error while submitting feedback' });
  }
});

// @route   GET /api/experiences/:bookingId/:experienceId
// @desc    Get experience details
// @access  Private
router.get('/:bookingId/:experienceId', auth, async (req, res) => {
  try {
    const { bookingId, experienceId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email')
      .populate('package', 'name location')
      .populate('experienceBookings.guide', 'name email businessInfo');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check access permissions
    if (booking.user._id.toString() !== req.user._id.toString() && 
        !['admin', 'business'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const experience = booking.experienceBookings.id(experienceId);
    if (!experience) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    res.json({
      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        user: booking.user,
        package: booking.package
      },
      experience: experience.toObject()
    });

  } catch (error) {
    console.error('Get experience details error:', error);
    res.status(500).json({ message: 'Server error while fetching experience details' });
  }
});

// @route   GET /api/experiences/upcoming
// @desc    Get upcoming experiences (Admin)
// @access  Admin
router.get('/upcoming', auth, adminAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const upcomingExperiences = await Booking.getUpcomingExperiences(Number(days));

    res.json({
      experiences: upcomingExperiences,
      daysAhead: Number(days),
      count: upcomingExperiences.length
    });

  } catch (error) {
    console.error('Get upcoming experiences error:', error);
    res.status(500).json({ message: 'Server error while fetching upcoming experiences' });
  }
});

// @route   GET /api/experiences/statistics
// @desc    Get experience statistics (Admin)
// @access  Admin
router.get('/statistics', auth, adminAuth, async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      { $unwind: '$experienceBookings' },
      {
        $group: {
          _id: '$experienceBookings.status',
          count: { $sum: 1 },
          totalParticipants: { $sum: '$experienceBookings.currentParticipants' }
        }
      }
    ]);

    const typeStats = await Booking.aggregate([
      { $unwind: '$experienceBookings' },
      {
        $group: {
          _id: '$experienceBookings.type',
          count: { $sum: 1 },
          avgRating: { 
            $avg: { 
              $avg: '$experienceBookings.feedback.rating' 
            } 
          }
        }
      }
    ]);

    const monthlyStats = await Booking.aggregate([
      { $unwind: '$experienceBookings' },
      {
        $group: {
          _id: {
            year: { $year: '$experienceBookings.scheduledDate' },
            month: { $month: '$experienceBookings.scheduledDate' }
          },
          count: { $sum: 1 },
          completed: {
            $sum: { 
              $cond: [
                { $eq: ['$experienceBookings.status', 'completed'] }, 
                1, 
                0
              ] 
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      statusStats: stats,
      typeStats,
      monthlyStats: monthlyStats.reverse()
    });

  } catch (error) {
    console.error('Get experience statistics error:', error);
    res.status(500).json({ message: 'Server error while fetching experience statistics' });
  }
});

module.exports = router;