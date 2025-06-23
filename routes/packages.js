const express = require('express');
const Joi = require('joi');
const Package = require('../models/Package');
const Review = require('../models/Review');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');

const router = express.Router();

// Validation schema for package creation/update
const packageSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  description: Joi.string().required().min(10),
  shortDescription: Joi.string().required().max(200),
  coralType: Joi.string().required().valid('Staghorn', 'Brain', 'Elkhorn', 'Pillar', 'Table', 'Soft', 'Mixed'),
  coralSpecies: Joi.string().required(),
  location: Joi.object({
    name: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }).optional(),
    depth: Joi.string().required(),
    waterTemperature: Joi.string().optional(),
    visibility: Joi.string().optional()
  }).required(),
  price: Joi.number().required().min(0),
  duration: Joi.number().required().min(1),
  maxCapacity: Joi.number().default(100),
  features: Joi.array().items(Joi.string()),
  benefits: Joi.array().items(Joi.string()),
  availableFrom: Joi.date().required(),
  availableTo: Joi.date().required(),
  status: Joi.string().valid('active', 'inactive', 'draft', 'soldOut').default('active'),
  featured: Joi.boolean().default(false),
  metaTitle: Joi.string().optional(),
  metaDescription: Joi.string().optional()
});

// @route   GET /api/packages
// @desc    Get all packages with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      coralType,
      location,
      minPrice,
      maxPrice,
      duration,
      status = 'active',
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = { status };

    if (coralType) filter.coralType = coralType;
    if (location) filter['location.name'] = new RegExp(location, 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (duration) filter.duration = Number(duration);
    if (featured !== undefined) filter.featured = featured === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { coralSpecies: new RegExp(search, 'i') }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const packages = await Package.find(filter)
      .populate('createdBy', 'name')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    // Get total count for pagination
    const total = await Package.countDocuments(filter);

    // Add additional info for each package
    const packagesWithInfo = packages.map(pkg => ({
      ...pkg,
      mainImage: pkg.images?.find(img => img.isMain)?.url || pkg.images?.[0]?.url,
      isAvailable: pkg.status === 'active' && 
                  new Date(pkg.availableFrom) <= new Date() && 
                  new Date(pkg.availableTo) >= new Date() &&
                  pkg.currentBookings < pkg.maxCapacity
    }));

    res.json({
      packages: packagesWithInfo,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ message: 'Server error while fetching packages' });
  }
});

// @route   GET /api/packages/featured
// @desc    Get featured packages
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const packages = await Package.getFeatured();
    
    const packagesWithInfo = packages.map(pkg => ({
      ...pkg.toObject(),
      mainImage: pkg.getMainImage(),
      isAvailable: pkg.isAvailable
    }));

    res.json({ packages: packagesWithInfo });
  } catch (error) {
    console.error('Get featured packages error:', error);
    res.status(500).json({ message: 'Server error while fetching featured packages' });
  }
});

// @route   GET /api/packages/stats
// @desc    Get package statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await Package.aggregate([
      {
        $group: {
          _id: null,
          totalPackages: { $sum: 1 },
          activePackages: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalBookings: { $sum: '$totalBookings' },
          totalRevenue: { $sum: '$totalRevenue' },
          avgRating: { $avg: '$averageRating' }
        }
      }
    ]);

    const coralTypeStats = await Package.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$coralType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      overall: stats[0] || {},
      coralTypes: coralTypeStats
    });
  } catch (error) {
    console.error('Get package stats error:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

// @route   GET /api/packages/:id
// @desc    Get package by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const packageId = req.params.id;

    const package = await Package.findById(packageId)
      .populate('createdBy', 'name avatar')
      .lean();

    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Get reviews for this package
    const reviews = await Review.find({
      package: packageId,
      isPublished: true,
      moderationStatus: 'approved'
    })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get review statistics
    const reviewStats = await Review.getPackageStats(packageId);

    res.json({
      package: {
        ...package,
        mainImage: package.images?.find(img => img.isMain)?.url || package.images?.[0]?.url,
        isAvailable: package.status === 'active' && 
                    new Date(package.availableFrom) <= new Date() && 
                    new Date(package.availableTo) >= new Date() &&
                    package.currentBookings < package.maxCapacity
      },
      reviews,
      reviewStats: reviewStats[0] || { averageRating: 0, totalReviews: 0, ratingDistribution: [] }
    });

  } catch (error) {
    console.error('Get package by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching package' });
  }
});

// @route   POST /api/packages
// @desc    Create new package
// @access  Admin only
router.post('/', auth, adminAuth, uploadImages, async (req, res) => {
  try {
    // Validate input
    const { error, value } = packageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Process uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        images.push({
          url: file.path, // Cloudinary URL
          caption: `${value.name} - Image ${index + 1}`,
          isMain: index === 0
        });
      });
    }

    // Create package
    const package = new Package({
      ...value,
      images,
      createdBy: req.user._id
    });

    await package.save();

    res.status(201).json({
      message: 'Package created successfully',
      package
    });

  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ message: 'Server error while creating package' });
  }
});

// @route   PUT /api/packages/:id
// @desc    Update package
// @access  Admin only
router.put('/:id', auth, adminAuth, uploadImages, async (req, res) => {
  try {
    const packageId = req.params.id;

    // Validate input
    const { error, value } = packageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Find existing package
    const existingPackage = await Package.findById(packageId);
    if (!existingPackage) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Process new images if uploaded
    let images = existingPackage.images;
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: file.path,
        caption: `${value.name} - Image ${index + 1}`,
        isMain: index === 0 && images.length === 0
      }));
      images = [...images, ...newImages];
    }

    // Update package
    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      { ...value, images },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Package updated successfully',
      package: updatedPackage
    });

  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ message: 'Server error while updating package' });
  }
});

// @route   DELETE /api/packages/:id
// @desc    Delete package
// @access  Admin only
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const packageId = req.params.id;

    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Check if package has active bookings
    const Booking = require('../models/Booking');
    const activeBookings = await Booking.countDocuments({
      package: packageId,
      status: { $in: ['confirmed', 'processing', 'growing'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot delete package with active bookings'
      });
    }

    await Package.findByIdAndDelete(packageId);

    res.json({ message: 'Package deleted successfully' });

  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ message: 'Server error while deleting package' });
  }
});

module.exports = router;