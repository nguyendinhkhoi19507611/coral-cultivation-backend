const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Package = require('../models/Package');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample data
const seedData = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@coralcultivation.com',
      password: 'admin123456',
      role: 'admin',
      isVerified: true,
      isActive: true,
      avatar: 'https://res.cloudinary.com/demo/image/upload/v1234567890/admin-avatar.jpg'
    },
    {
      name: 'Nguyễn Văn An',
      email: 'nguyenvanan@gmail.com',
      password: 'customer123',
      role: 'customer',
      phone: '0901234567',
      isVerified: true,
      isActive: true,
      avatar: 'https://res.cloudinary.com/demo/image/upload/v1234567891/customer1-avatar.jpg'
    },
    {
      name: 'Trần Thị Bình',
      email: 'tranthibinh@gmail.com',
      password: 'customer123',
      role: 'customer',
      phone: '0907654321',
      isVerified: true,
      isActive: true,
      avatar: 'https://res.cloudinary.com/demo/image/upload/v1234567892/customer2-avatar.jpg'
    },
    {
      name: 'Lê Hoàng Minh',
      email: 'lehoangminh@gmail.com',
      password: 'customer123',
      role: 'customer',
      phone: '0909876543',
      isVerified: true,
      isActive: true
    },
    {
      name: 'Phạm Thị Thu',
      email: 'phamthithu@gmail.com',
      password: 'customer123',
      role: 'customer',
      phone: '0908765432',
      isVerified: true,
      isActive: true
    },
    {
      name: 'Eco Travel Vietnam',
      email: 'info@ecotravelvn.com',
      password: 'business123',
      role: 'business',
      phone: '0281234567',
      isVerified: true,
      isActive: true,
      businessInfo: {
        companyName: 'Eco Travel Vietnam',
        description: 'Công ty du lịch sinh thái hàng đầu Việt Nam',
        address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
        website: 'https://ecotravelvn.com',
        logo: 'https://res.cloudinary.com/demo/image/upload/v1234567893/eco-travel-logo.png'
      }
    },
    {
      name: 'Green Ocean Tours',
      email: 'contact@greenoceantours.vn',
      password: 'business123',
      role: 'business',
      phone: '0288765432',
      isVerified: true,
      isActive: true,
      businessInfo: {
        companyName: 'Green Ocean Tours',
        description: 'Chuyên tour lặn biển và bảo vệ san hô',
        address: '456 Đường Hùng Vương, Nha Trang, Khánh Hòa',
        website: 'https://greenoceantours.vn',
        logo: 'https://res.cloudinary.com/demo/image/upload/v1234567894/green-ocean-logo.png'
      }
    },
    {
      name: 'Ocean Conservation Corp',
      email: 'partnership@oceanconservation.vn',
      password: 'business123',
      role: 'business',
      phone: '0283456789',
      isVerified: true,
      isActive: true,
      businessInfo: {
        companyName: 'Ocean Conservation Corp',
        description: 'Tập đoàn đầu tư vào các dự án bảo tồn biển',
        address: '789 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        website: 'https://oceanconservation.vn',
        logo: 'https://res.cloudinary.com/demo/image/upload/v1234567895/ocean-corp-logo.png'
      }
    }
  ],

  packages: [
    {
      name: 'Gói Trồng San Hô Staghorn - Nha Trang Premium',
      description: 'Tham gia bảo tồn san hô Staghorn tại vùng biển Nha Trang với công nghệ tiên tiến nhất.',
      shortDescription: 'Trồng san hô Staghorn tại Nha Trang với công nghệ giám sát 24/7',
      coralType: 'Staghorn',
      coralSpecies: 'Acropora cervicornis',
      location: {
        name: 'Vùng biển Nha Trang - Khu bảo tồn biển Hòn Mun',
        coordinates: {
          latitude: 12.2388,
          longitude: 109.1967
        },
        depth: '5-15 mét',
        waterTemperature: '26-30°C',
        visibility: '15-25 mét'
      },
      price: 650000,
      duration: 8,
      maxCapacity: 150,
      features: [
        'Camera giám sát HD 24/7',
        'Báo cáo tiến độ hàng tuần',
        'Hình ảnh và video 4K chất lượng cao',
        'Chứng nhận bảo tồn có QR code',
        'Ứng dụng mobile theo dõi real-time'
      ],
      benefits: [
        'Bảo vệ đa dạng sinh học biển Việt Nam',
        'Chống xói mòn bờ biển tự nhiên',
        'Tạo môi trường sống cho 65+ loài cá nhiệt đới',
        'Góp phần chống biến đổi khí hậu'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/staghorn-main.jpg',
          caption: 'San hô Staghorn trưởng thành tại Nha Trang',
          isMain: true
        }
      ],
      videos: [],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Staghorn Nha Trang Premium',
      metaDescription: 'Tham gia trồng san hô Staghorn tại Nha Trang với công nghệ giám sát 24/7'
    },
    {
      name: 'Gói Trồng San Hô Brain Coral - Phú Quốc Deluxe',
      description: 'Bảo tồn san hô Brain Coral tại vùng biển trong xanh Phú Quốc.',
      shortDescription: 'Bảo tồn san hô Brain Coral tại Phú Quốc',
      coralType: 'Brain',
      coralSpecies: 'Diploria labyrinthiformis',
      location: {
        name: 'Vùng biển Phú Quốc - An Thới Marine Park',
        coordinates: {
          latitude: 10.2899,
          longitude: 103.9840
        },
        depth: '8-20 mét',
        waterTemperature: '27-31°C',
        visibility: '20-30 mét'
      },
      price: 950000,
      duration: 15,
      maxCapacity: 80,
      features: [
        'Nghiên cứu DNA và di truyền san hô',
        'Báo cáo khoa học chi tiết 2 tuần/lần',
        'Video 360° môi trường san hô',
        'Chứng nhận cao cấp'
      ],
      benefits: [
        'Bảo tồn loài san hô cực quý hiếm',
        'Tạo rạn san hô nhân tạo bền vững',
        'Đóng góp cho nghiên cứu khoa học thế giới'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567895/brain-coral-main.jpg',
          caption: 'San hô Brain Coral phát triển mạnh tại Phú Quốc',
          isMain: true
        }
      ],
      videos: [],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Brain Coral Phú Quốc Deluxe',
      metaDescription: 'Tham gia bảo tồn san hô Brain Coral tại Phú Quốc'
    },
    {
      name: 'Gói Trồng San Hô Mềm - Hạ Long Heritage',
      description: 'Dự án bảo tồn san hô mềm độc đáo tại vịnh Hạ Long.',
      shortDescription: 'Bảo tồn san hô mềm tại vịnh Hạ Long - Di sản thiên nhiên thế giới UNESCO',
      coralType: 'Soft',
      coralSpecies: 'Sarcophyton trocheliophorum',
      location: {
        name: 'Vịnh Hạ Long - UNESCO World Heritage Site',
        coordinates: {
          latitude: 20.9101,
          longitude: 107.1839
        },
        depth: '3-12 mét',
        waterTemperature: '22-28°C',
        visibility: '10-20 mét'
      },
      price: 450000,
      duration: 6,
      maxCapacity: 200,
      features: [
        'Báo cáo tiến độ hàng tuần',
        'Hình ảnh HD chất lượng cao',
        'Chứng nhận UNESCO World Heritage'
      ],
      benefits: [
        'Bảo vệ di sản UNESCO',
        'Cải thiện chất lượng nước biển vịnh',
        'Tăng đa dạng sinh học vùng di sản'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567903/soft-coral-main.jpg',
          caption: 'San hô mềm nhiều màu sắc tại Hạ Long',
          isMain: true
        }
      ],
      videos: [],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: false,
      metaTitle: 'Trồng San Hô Mềm Hạ Long Heritage',
      metaDescription: 'Tham gia bảo tồn san hô mềm tại vịnh Hạ Long di sản UNESCO'
    }
  ]
};

// Enhanced sample bookings data
const createSampleBookings = async (users, packages) => {
  console.log('📋 Creating sample bookings...');
  
  // Find users by email to ensure they exist
  const admin = users.find(u => u.role === 'admin');
  const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
  const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
  const customer3 = users.find(u => u.email === 'lehoangminh@gmail.com');
  const business1 = users.find(u => u.email === 'info@ecotravelvn.com');

  // Debug: Check if users are found
  console.log('Debug - Found users:');
  console.log('Admin:', admin ? admin.name : 'NOT FOUND');
  console.log('Customer1:', customer1 ? customer1.name : 'NOT FOUND');
  console.log('Customer2:', customer2 ? customer2.name : 'NOT FOUND');
  console.log('Customer3:', customer3 ? customer3.name : 'NOT FOUND');
  console.log('Business1:', business1 ? business1.name : 'NOT FOUND');

  // Ensure we have required users
  if (!admin || !customer1 || !customer2) {
    throw new Error('Required users not found. Admin, Customer1, and Customer2 are required.');
  }

  const sampleBookings = [
    // Booking 1 - Customer1 - Staghorn - Growing
    {
      user: customer1._id,
      package: packages[0]._id,
      quantity: 2,
      unitPrice: packages[0].price,
      contactInfo: {
        name: customer1.name,
        email: customer1.email,
        phone: customer1.phone || '0901234567',
        address: '123 Đường Lê Văn Sỹ, Quận 3, TP.HCM',
        specialRequests: 'Muốn được tham quan thực tế và nhận báo cáo chi tiết'
      },
      status: 'growing',
      paymentStatus: 'paid',
      paymentMethod: 'momo',
      paidAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
        location: packages[0].location,
        progress: [
          {
            date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
            status: 'confirmed',
            description: 'Booking được xác nhận, chuẩn bị bắt đầu quá trình trồng san hô',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567915/progress1-1.jpg'],
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            status: 'growing',
            description: 'San hô đã được đặt thành công và bắt đầu quá trình phát triển',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567917/progress1-3.jpg'],
            reportedBy: admin._id
          }
        ]
      },
      notifications: [
        {
          type: 'booking_confirmed',
          title: 'Booking được xác nhận',
          message: 'Cảm ơn bạn đã tham gia dự án bảo tồn san hô!',
          priority: 'medium',
          sentAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000)
        }
      ]
    },

    // Booking 2 - Customer2 - Brain Coral - Completed
    {
      user: customer2._id,
      package: packages[1]._id,
      quantity: 1,
      unitPrice: packages[1].price,
      contactInfo: {
        name: customer2.name,
        email: customer2.email,
        phone: customer2.phone || '0907654321',
        address: '456 Đường Cách Mạng Tháng 8, Quận 10, TP.HCM'
      },
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 480 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        actualCompletionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        location: packages[1].location,
        progress: [
          {
            date: new Date(Date.now() - 480 * 24 * 60 * 60 * 1000),
            status: 'confirmed',
            description: 'Bắt đầu dự án bảo tồn san hô Brain Coral',
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            status: 'completed',
            description: 'San hô đã hoàn thành quá trình phát triển',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567922/progress2-final1.jpg'],
            reportedBy: admin._id
          }
        ],
        finalReport: {
          completionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          finalImages: ['https://res.cloudinary.com/demo/image/upload/v1234567924/final-report2-1.jpg'],
          growthData: {
            initialSize: 8,
            finalSize: 45,
            growthRate: 2.5,
            healthScore: 98
          },
          environmentalImpact: 'San hô đã tạo môi trường sống cho 28 loài sinh vật biển',
          notes: 'Dự án thành công vượt mong đợi'
        }
      },
      certificate: {
        isGenerated: true,
        certificateUrl: 'https://res.cloudinary.com/demo/raw/upload/v1234567928/certificate-brain-coral.pdf',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51...',
        generatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        downloadCount: 3
      },
      notifications: [
        {
          type: 'completed',
          title: 'San hô hoàn thành phát triển',
          message: 'Chúc mừng! San hô Brain Coral của bạn đã hoàn thành quá trình phát triển.',
          priority: 'high',
          sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
        }
      ]
    }
  ];

  // Add more bookings only if users exist
  if (customer3) {
    sampleBookings.push({
      user: customer3._id,
      package: packages[2]._id,
      quantity: 1,
      unitPrice: packages[2].price,
      contactInfo: {
        name: customer3.name,
        email: customer3.email,
        phone: customer3.phone || '0909876543',
        address: '789 Đường Võ Văn Tần, Quận 3, TP.HCM'
      },
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'momo',
      cultivation: {
        estimatedCompletionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      },
      notifications: [
        {
          type: 'payment_reminder',
          title: 'Nhắc nhở thanh toán',
          message: 'Booking của bạn đang chờ thanh toán.',
          priority: 'high',
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          isRead: false,
          actionRequired: true,
          actionUrl: '/payment'
        }
      ]
    });
  }

  if (business1) {
    sampleBookings.push({
      user: business1._id,
      package: packages[0]._id,
      quantity: 5,
      unitPrice: packages[0].price,
      contactInfo: {
        name: business1.businessInfo.companyName,
        email: business1.email,
        phone: business1.phone || '0281234567',
        address: business1.businessInfo.address,
        specialRequests: 'Cần báo cáo CSR chi tiết cho báo cáo thường niên'
      },
      businessBooking: {
        isBusinessBooking: true,
        businessName: business1.businessInfo.companyName,
        referralCode: business1.businessInfo?.referralCode || 'ECOTRAVELVN001',
        groupSize: 15,
        corporateDiscount: 10
      },
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 220 * 24 * 60 * 60 * 1000),
        location: packages[0].location,
        progress: [
          {
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 'confirmed',
            description: 'Dự án corporate bảo tồn san hô được khởi động',
            reportedBy: admin._id
          }
        ]
      },
      notifications: [
        {
          type: 'booking_confirmed',
          title: 'Corporate booking được xác nhận',
          message: 'Cảm ơn Eco Travel Vietnam đã tham gia dự án bảo tồn.',
          priority: 'high',
          sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          isRead: true
        }
      ]
    });
  }

  return sampleBookings;
};

// Create sample reviews
const createSampleReviews = async (users, packages, bookings) => {
  console.log('⭐ Creating sample reviews...');
  
  const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
  const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
  const admin = users.find(u => u.role === 'admin');

  if (!customer2 || !customer1 || !admin) {
    console.log('⚠️ Some users not found for reviews, skipping...');
    return [];
  }

  const completedBooking = bookings.find(b => b.status === 'completed');
  const growingBooking = bookings.find(b => b.status === 'growing');

  const sampleReviews = [];

  if (completedBooking) {
    sampleReviews.push({
      user: customer2._id,
      package: packages[1]._id, // Brain Coral
      booking: completedBooking._id,
      rating: 5,
      title: 'Trải nghiệm tuyệt vời và ý nghĩa!',
      content: 'Tôi đã theo dõi san hô Brain Coral của mình suốt 15 tháng và cảm thấy vô cùng hạnh phúc khi thấy nó phát triển mạnh mẽ. Đội ngũ báo cáo rất chuyên nghiệp.',
      detailedRatings: {
        serviceQuality: 5,
        communication: 5,
        value: 4,
        experience: 5
      },
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567936/review1-1.jpg',
          caption: 'San hô Brain Coral của tôi sau 15 tháng'
        }
      ],
      isVerified: true,
      moderationStatus: 'approved',
      moderatedBy: admin._id,
      moderatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      helpfulCount: 8
    });
  }

  if (growingBooking) {
    sampleReviews.push({
      user: customer1._id,
      package: packages[0]._id, // Staghorn
      booking: growingBooking._id,
      rating: 4,
      title: 'Dự án chất lượng, theo dõi rất tốt',
      content: 'Mặc dù san hô của tôi vẫn đang trong quá trình phát triển nhưng tôi đã rất hài lòng với chất lượng dịch vụ.',
      detailedRatings: {
        serviceQuality: 4,
        communication: 5,
        value: 4,
        experience: 4
      },
      isVerified: true,
      moderationStatus: 'approved',
      moderatedBy: admin._id,
      moderatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      helpfulCount: 5
    });
  }

  return sampleReviews;
};

// Create sample notifications
const createSampleNotifications = async (users, bookings) => {
  console.log('🔔 Creating sample notifications...');
  
  const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
  const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
  const admin = users.find(u => u.role === 'admin');

  if (!customer1 || !customer2 || !admin) {
    console.log('⚠️ Some users not found for notifications, skipping...');
    return [];
  }

  const sampleNotifications = [
    {
      recipient: customer1._id,
      type: 'system_maintenance',
      title: '🔧 Bảo trì hệ thống',
      message: 'Hệ thống sẽ được bảo trì từ 2:00 - 4:00 sáng ngày mai.',
      priority: 'medium',
      icon: 'wrench',
      color: 'blue',
      channels: ['in_app', 'email'],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sender: admin._id,
      senderType: 'admin'
    },
    {
      recipient: customer1._id,
      type: 'promotion',
      title: '🎉 Ưu đãi mùa Xuân',
      message: 'Giảm 20% cho gói Soft Coral Hạ Long trong tháng 3.',
      priority: 'low',
      icon: 'gift',
      color: 'green',
      actionButton: {
        text: 'Xem gói ưu đãi',
        url: '/packages/soft-coral-ha-long'
      },
      channels: ['in_app', 'email'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sender: admin._id,
      senderType: 'admin'
    },
    {
      recipient: customer2._id,
      type: 'certificate_ready',
      title: '🏆 Chứng nhận đã sẵn sàng',
      message: 'Chúc mừng! Chứng nhận bảo tồn san hô của bạn đã được tạo thành công.',
      priority: 'high',
      icon: 'award',
      color: 'gold',
      actionRequired: true,
      actionButton: {
        text: 'Tải chứng nhận',
        url: '/certificates/download'
      },
      channels: ['in_app', 'email'],
      relatedBooking: bookings.find(b => b.status === 'completed')?._id
    }
  ];

  return sampleNotifications;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting comprehensive database seeding...');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Package.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create users
    console.log('👥 Creating users...');
    const users = [];
    for (const userData of seedData.users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      users.push(user);
      console.log(`✅ Created user: ${user.name} (${user.role})`);
    }

    // Create packages
    console.log('📦 Creating packages...');
    const packages = [];
    for (const packageData of seedData.packages) {
      const adminUser = users.find(u => u.role === 'admin');
      const package = new Package({
        ...packageData,
        createdBy: adminUser._id
      });
      await package.save();
      packages.push(package);
      console.log(`✅ Created package: ${package.name}`);
    }

    // Create bookings
    console.log('🎫 Creating bookings...');
    const sampleBookings = await createSampleBookings(users, packages);
    const createdBookings = [];
    
    for (let i = 0; i < sampleBookings.length; i++) {
      try {
        const bookingData = sampleBookings[i];
        const booking = new Booking(bookingData);
        
        await booking.validate();
        await booking.save();
        createdBookings.push(booking);
        
        // Update package statistics
        const package = await Package.findById(booking.package);
        if (package) {
          package.currentBookings += booking.quantity;
          package.totalBookings += booking.quantity;
          if (booking.paymentStatus === 'paid') {
            package.totalRevenue += booking.totalAmount;
          }
          await package.save();
        }
        
        console.log(`✅ Created booking: ${booking.bookingNumber} (${booking.status})`);
      } catch (error) {
        console.error(`❌ Failed to create booking ${i + 1}:`, error.message);
      }
    }

    // Create reviews
    console.log('⭐ Creating reviews...');
    const sampleReviews = await createSampleReviews(users, packages, createdBookings);
    
    for (const reviewData of sampleReviews) {
      try {
        const review = new Review(reviewData);
        await review.save();
        console.log(`✅ Created review: ${review.title}`);
      } catch (error) {
        console.error(`❌ Failed to create review:`, error.message);
      }
    }

    // Create notifications
    console.log('🔔 Creating notifications...');
    const sampleNotifications = await createSampleNotifications(users, createdBookings);
    
    for (const notificationData of sampleNotifications) {
      try {
        const notification = new Notification(notificationData);
        await notification.save();
        console.log(`✅ Created notification: ${notification.title}`);
      } catch (error) {
        console.error(`❌ Failed to create notification:`, error.message);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    
    // Print comprehensive summary
    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`   - Admins: ${users.filter(u => u.role === 'admin').length}`);
    console.log(`   - Customers: ${users.filter(u => u.role === 'customer').length}`);
    console.log(`   - Businesses: ${users.filter(u => u.role === 'business').length}`);
    console.log(`📦 Packages: ${packages.length}`);
    console.log(`   - Featured: ${packages.filter(p => p.featured).length}`);
    console.log(`   - Active: ${packages.filter(p => p.status === 'active').length}`);
    console.log(`🎫 Bookings: ${createdBookings.length}`);
    console.log(`   - Pending: ${createdBookings.filter(b => b.status === 'pending').length}`);
    console.log(`   - Growing: ${createdBookings.filter(b => b.status === 'growing').length}`);
    console.log(`   - Completed: ${createdBookings.filter(b => b.status === 'completed').length}`);
    console.log(`   - Business bookings: ${createdBookings.filter(b => b.businessBooking?.isBusinessBooking).length}`);
    console.log(`⭐ Reviews: ${sampleReviews.length}`);
    console.log(`🔔 Notifications: ${sampleNotifications.length}`);
    
    // Calculate revenue statistics
    const totalRevenue = createdBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.totalAmount, 0);
    
    const pendingRevenue = createdBookings
      .filter(b => b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + b.totalAmount, 0);
    
    console.log(`💰 Revenue Statistics:`);
    console.log(`   - Total paid revenue: ${totalRevenue.toLocaleString()} VND`);
    console.log(`   - Pending revenue: ${pendingRevenue.toLocaleString()} VND`);
    console.log(`   - Average booking value: ${Math.round(totalRevenue / Math.max(createdBookings.filter(b => b.paymentStatus === 'paid').length, 1)).toLocaleString()} VND`);
    
    console.log('\n🎯 TEST ACCOUNTS:');
    console.log('📧 LOGIN CREDENTIALS:');
    console.log('Admin: admin@coralcultivation.com / admin123456');
    console.log('Customer 1: nguyenvanan@gmail.com / customer123');
    console.log('Customer 2: tranthibinh@gmail.com / customer123');
    console.log('Customer 3: lehoangminh@gmail.com / customer123');
    console.log('Customer 4: phamthithu@gmail.com / customer123');
    console.log('Business 1: info@ecotravelvn.com / business123');
    console.log('Business 2: contact@greenoceantours.vn / business123');
    console.log('Business 3: partnership@oceanconservation.vn / business123');
    
    console.log('\n📱 TESTING SCENARIOS:');
    console.log('🔹 Customer1 (An): Has growing coral with progress updates');
    console.log('🔹 Customer2 (Bình): Has completed coral with certificate and review');
    console.log('🔹 Customer3 (Minh): Has pending payment for testing payment flow');
    console.log('🔹 Business1 (Eco Travel): Corporate booking with discount');
    
    console.log('\n🔧 FEATURE TESTING:');
    console.log('✓ Payment flows (MoMo, Bank Transfer)');
    console.log('✓ Real-time notifications');
    console.log('✓ Progress tracking with media');
    console.log('✓ Certificate generation');
    console.log('✓ Review and rating system');
    console.log('✓ Business/Corporate features');
    console.log('✓ Admin dashboard and analytics');
    
    console.log('\n🌊 Ready to protect our oceans! 🪸');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

// Utility function to reset specific collections
const resetCollection = async (collectionName) => {
  try {
    switch (collectionName.toLowerCase()) {
      case 'users':
        await User.deleteMany({});
        console.log('✅ Users collection cleared');
        break;
      case 'packages':
        await Package.deleteMany({});
        console.log('✅ Packages collection cleared');
        break;
      case 'bookings':
        await Booking.deleteMany({});
        console.log('✅ Bookings collection cleared');
        break;
      case 'reviews':
        await Review.deleteMany({});
        console.log('✅ Reviews collection cleared');
        break;
      case 'notifications':
        await Notification.deleteMany({});
        console.log('✅ Notifications collection cleared');
        break;
      case 'all':
        await User.deleteMany({});
        await Package.deleteMany({});
        await Booking.deleteMany({});
        await Review.deleteMany({});
        await Notification.deleteMany({});
        console.log('✅ All collections cleared');
        break;
      default:
        console.log('❌ Unknown collection:', collectionName);
        console.log('Available options: users, packages, bookings, reviews, notifications, all');
    }
  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  }
};

// Function to create additional test data for specific scenarios
const createTestScenarios = async () => {
  try {
    console.log('🧪 Creating additional test scenarios...');
    
    // Find existing users
    const users = await User.find({});
    const admin = users.find(u => u.role === 'admin');
    const customer = users.find(u => u.role === 'customer');
    
    if (!admin || !customer) {
      console.log('❌ Need to run main seeding first');
      return;
    }
    
    // Create package with soldOut status for testing
    const soldOutPackage = new Package({
      name: 'Gói Sold Out - Testing',
      description: 'Package for testing sold out functionality',
      shortDescription: 'Test sold out status',
      coralType: 'Staghorn',
      coralSpecies: 'Acropora cervicornis',
      location: {
        name: 'Test Location',
        depth: '5-10m',
        waterTemperature: '26-30°C',
        visibility: '15-20m'
      },
      price: 100000,
      duration: 3,
      maxCapacity: 1,
      currentBookings: 1, // Make it sold out
      status: 'soldOut',
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      createdBy: admin._id,
      features: ['Test feature'],
      benefits: ['Test benefit']
    });
    await soldOutPackage.save();
    
    // Create cancelled booking for testing
    const cancelledBooking = new Booking({
      user: customer._id,
      package: soldOutPackage._id,
      quantity: 1,
      unitPrice: soldOutPackage.price,
      contactInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '0901234567'
      },
      status: 'cancelled',
      paymentStatus: 'refunded',
      cancellation: {
        reason: 'Cancelled for testing purposes',
        cancelledAt: new Date(),
        refundAmount: soldOutPackage.price,
        refundProcessedAt: new Date()
      }
    });
    await cancelledBooking.save();
    
    console.log('✅ Test scenarios created successfully');
    console.log('🔹 Sold out package created');
    console.log('🔹 Cancelled booking created');
    
  } catch (error) {
    console.error('❌ Test scenarios creation failed:', error);
    throw error;
  }
};

// Run seeding
const runSeed = async () => {
  try {
    await connectDB();
    await seedDatabase();
    
    // Ask if user wants to create additional test scenarios
    if (process.argv.includes('--test-scenarios')) {
      await createTestScenarios();
    }
    
    console.log('\n🌊 Database is ready! Time to save our oceans! 🪸');
    
  } catch (error) {
    console.error('❌ Seeding process failed:', error);
  } finally {
    process.exit(0);
  }
};

// Export for use in other files
module.exports = {
  seedDatabase,
  connectDB,
  resetCollection,
  createTestScenarios,
  seedData
};

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('\n🌊 Coral Cultivation Database Seeder 🪸\n');
    console.log('Usage: node utils/seedData.js [options]\n');
    console.log('Options:');
    console.log('  --help                    Show this help message');
    console.log('  --test-scenarios          Create additional test scenarios');
    console.log('  --reset <collection>      Reset specific collection (users|packages|bookings|reviews|notifications|all)');
    console.log('\nExamples:');
    console.log('  node utils/seedData.js');
    console.log('  node utils/seedData.js --test-scenarios');
    console.log('  node utils/seedData.js --reset users');
    console.log('\n🌊 Happy seeding! 🪸\n');
    process.exit(0);
  }
  
  if (args.includes('--reset')) {
    const resetIndex = args.indexOf('--reset');
    const collection = args[resetIndex + 1];
    
    if (!collection) {
      console.log('❌ Please specify collection to reset');
      console.log('Available: users, packages, bookings, reviews, notifications, all');
      process.exit(1);
    }
    
    connectDB().then(() => {
      resetCollection(collection).then(() => {
        console.log('✅ Reset completed');
        process.exit(0);
      }).catch(error => {
        console.error('❌ Reset failed:', error);
        process.exit(1);
      });
    });
  } else {
    runSeed();
  }
}