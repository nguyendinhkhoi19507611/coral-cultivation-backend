const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Package = require('../models/Package');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

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
      isActive: true
    },
    {
      name: 'Nguyễn Văn An',
      email: 'nguyenvanan@gmail.com',
      password: 'customer123',
      role: 'customer',
      phone: '0901234567',
      isVerified: true,
      isActive: true
    },
    {
      name: 'Trần Thị Bình',
      email: 'tranthibinh@gmail.com',
      password: 'customer123',
      role: 'customer',
      phone: '0907654321',
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
        website: 'https://ecotravelvn.com'
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
        address: '456 Đường Hùng Vương, Nha Trang',
        website: 'https://greenoceantours.vn'
      }
    }
  ],

  packages: [
    {
      name: 'Gói Trồng San Hô Staghorn - Nha Trang',
      description: 'Tham gia bảo tồn san hô Staghorn tại vùng biển Nha Trang. Đây là loài san hô quý hiếm có khả năng phát triển nhanh và tạo môi trường sống cho nhiều loài sinh vật biển. Gói bao gồm: theo dõi quá trình trồng, báo cáo định kỳ với hình ảnh, video và chứng nhận hoàn thành.',
      shortDescription: 'Trồng san hô Staghorn tại Nha Trang - Góp phần bảo vệ rạn san hô Việt Nam',
      coralType: 'Staghorn',
      coralSpecies: 'Acropora cervicornis',
      location: {
        name: 'Vùng biển Nha Trang',
        coordinates: {
          latitude: 12.2388,
          longitude: 109.1967
        },
        depth: '5-15 mét',
        waterTemperature: '26-30°C',
        visibility: '15-25 mét'
      },
      price: 500000,
      duration: 6,
      maxCapacity: 100,
      features: [
        'Báo cáo tiến độ hàng tháng',
        'Hình ảnh và video thực tế',
        'Chứng nhận bảo tồn có QR code',
        'Theo dõi GPS vị trí san hô',
        'Tham quan thực tế (tùy chọn)'
      ],
      benefits: [
        'Bảo vệ đa dạng sinh học biển',
        'Chống xói mòn bờ biển',
        'Tạo môi trường sống cho cá',
        'Góp phần chống biến đổi khí hậu',
        'Phát triển du lịch sinh thái'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/coral1.jpg',
          caption: 'San hô Staghorn trưởng thành',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567891/coral2.jpg',
          caption: 'Quá trình trồng san hô',
          isMain: false
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Staghorn Nha Trang - Bảo Tồn Biển',
      metaDescription: 'Tham gia trồng san hô Staghorn tại Nha Trang. Nhận chứng nhận, theo dõi tiến độ và góp phần bảo vệ đại dương.'
    },
    {
      name: 'Gói Trồng San Hô Brain Coral - Phú Quốc',
      description: 'Bảo tồn san hô Brain Coral (san hô não) tại vùng biển trong xanh Phú Quốc. Loài san hô này có hình dạng đặc biệt giống như bộ não người và có tuổi thọ rất cao, có thể sống hàng trăm năm. Dự án này giúp phục hồi hệ sinh thái rạn san hô và tạo nơi trú ẩn cho nhiều loài cá nhiệt đới.',
      shortDescription: 'Bảo tồn san hô Brain Coral tại Phú Quốc - Loài san hô có tuổi thọ cao',
      coralType: 'Brain',
      coralSpecies: 'Diploria labyrinthiformis',
      location: {
        name: 'Vùng biển Phú Quốc',
        coordinates: {
          latitude: 10.2899,
          longitude: 103.9840
        },
        depth: '8-20 mét',
        waterTemperature: '27-31°C',
        visibility: '20-30 mét'
      },
      price: 750000,
      duration: 12,
      maxCapacity: 50,
      features: [
        'Báo cáo chi tiết 2 tuần/lần',
        'Video 360° môi trường san hô',
        'Chứng nhận cao cấp với hologram',
        'Ứng dụng theo dõi real-time',
        'Tour lặn ngắm san hô miễn phí'
      ],
      benefits: [
        'Bảo tồn loài san hô quý hiếm',
        'Tạo rạn san hô nhân tạo',
        'Nghiên cứu khoa học biển',
        'Phát triển ngành du lịch lặn',
        'Giáo dục bảo vệ môi trường'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567892/brain-coral1.jpg',
          caption: 'San hô Brain Coral phát triển',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567893/brain-coral2.jpg',
          caption: 'Hệ sinh thái san hô não',
          isMain: false
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Brain Coral Phú Quốc - Bảo Tồn Sinh Thái',
      metaDescription: 'Tham gia bảo tồn san hô Brain Coral tại Phú Quốc. Loài san hô quý hiếm với tuổi thọ hàng trăm năm.'
    },
    {
      name: 'Gói Trồng San Hô Table Coral - Côn Đảo',
      description: 'Khôi phục rạn san hô Table Coral (san hô bàn) tại khu bảo tồn biển Côn Đảo. Đây là dự án đặc biệt nhằm phục hồi hệ sinh thái biển sau tác động của biến đổi khí hậu. San hô Table có khả năng tạo nên những "thành phố dưới nước" cho hàng nghìn loài sinh vật biển.',
      shortDescription: 'Khôi phục san hô Table Coral tại Côn Đảo - Tạo thành phố dưới nước',
      coralType: 'Table',
      coralSpecies: 'Acropora hyacinthus',
      location: {
        name: 'Khu bảo tồn biển Côn Đảo',
        coordinates: {
          latitude: 8.6883,
          longitude: 106.6103
        },
        depth: '10-25 mét',
        waterTemperature: '26-29°C',
        visibility: '25-35 mét'
      },
      price: 1200000,
      duration: 18,
      maxCapacity: 30,
      features: [
        'Giám sát bằng camera dưới nước 24/7',
        'Báo cáo khoa học chuyên sâu',
        'Chứng nhận từ Vườn Quốc gia Côn Đảo',
        'Ứng dụng VR trải nghiệm san hô',
        'Chương trình eco-tour 3 ngày'
      ],
      benefits: [
        'Phục hồi hệ sinh thái quý hiếm',
        'Bảo vệ di sản thiên nhiên',
        'Nghiên cứu khoa học hàng đầu',
        'Phát triển du lịch bền vững',
        'Giáo dục môi trường cộng đồng'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567894/table-coral1.jpg',
          caption: 'San hô Table Coral rộng lớn',
          isMain: true
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Table Coral Côn Đảo - Phục Hồi Hệ Sinh Thái',
      metaDescription: 'Tham gia phục hồi san hô Table Coral tại Côn Đảo. Dự án bảo tồn đặc biệt với công nghệ giám sát tiên tiến.'
    },
    {
      name: 'Gói Trồng San Hô Mềm - Hạ Long',
      description: 'Dự án bảo tồn san hô mềm độc đáo tại vịnh Hạ Long. San hô mềm có khả năng lọc nước biển và tạo môi trường trong lành cho các loài sinh vật. Đây là cơ hội để bạn góp phần bảo vệ di sản thiên nhiên thế giới.',
      shortDescription: 'Bảo tồn san hô mềm tại vịnh Hạ Long - Di sản thiên nhiên thế giới',
      coralType: 'Soft',
      coralSpecies: 'Sarcophyton trocheliophorum',
      location: {
        name: 'Vịnh Hạ Long',
        coordinates: {
          latitude: 20.9101,
          longitude: 107.1839
        },
        depth: '3-12 mét',
        waterTemperature: '22-28°C',
        visibility: '10-20 mét'
      },
      price: 350000,
      duration: 4,
      maxCapacity: 200,
      features: [
        'Báo cáo hàng tuần',
        'Hình ảnh HD chất lượng cao',
        'Chứng nhận UNESCO',
        'Ứng dụng mobile tracking',
        'Tour du thuyền Hạ Long'
      ],
      benefits: [
        'Bảo vệ di sản UNESCO',
        'Cải thiện chất lượng nước biển',
        'Tăng đa dạng sinh học',
        'Phát triển du lịch xanh',
        'Giáo dục ý thức môi trường'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567895/soft-coral1.jpg',
          caption: 'San hô mềm nhiều màu sắc',
          isMain: true
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: false,
      metaTitle: 'Trồng San Hô Mềm Hạ Long - Bảo Vệ Di Sản UNESCO',
      metaDescription: 'Tham gia bảo tồn san hô mềm tại vịnh Hạ Long. Góp phần bảo vệ di sản thiên nhiên thế giới.'
    }
  ]
};

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Package.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const users = [];
    for (const userData of seedData.users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      users.push(user);
      console.log(`👤 Created user: ${user.name} (${user.role})`);
    }

    // Create packages
    const packages = [];
    for (const packageData of seedData.packages) {
      const adminUser = users.find(u => u.role === 'admin');
      const package = new Package({
        ...packageData,
        createdBy: adminUser._id
      });
      await package.save();
      packages.push(package);
      console.log(`📦 Created package: ${package.name}`);
    }

    // Create sample bookings
    const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
    const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
    const business1 = users.find(u => u.role === 'business');

    const sampleBookings = [
      {
        user: customer1._id,
        package: packages[0]._id,
        quantity: 2,
        unitPrice: packages[0].price,
        contactInfo: {
          name: customer1.name,
          email: customer1.email,
          phone: customer1.phone,
          address: '123 Đường ABC, Quận 1, TP.HCM',
          specialRequests: 'Muốn được tham quan thực tế'
        },
        status: 'growing',
        paymentStatus: 'paid',
        paidAt: new Date(),
        cultivation: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          estimatedCompletionDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
          location: packages[0].location,
          progress: [
            {
              status: 'confirmed',
              description: 'Booking được xác nhận và bắt đầu quá trình trồng san hô',
              reportedBy: users[0]._id
            },
            {
              status: 'growing',
              description: 'San hô đã được đặt và bắt đầu phát triển tốt',
              reportedBy: users[0]._id
            }
          ]
        }
      },
      {
        user: customer2._id,
        package: packages[1]._id,
        quantity: 1,
        unitPrice: packages[1].price,
        contactInfo: {
          name: customer2.name,
          email: customer2.email,
          phone: customer2.phone,
          address: '456 Đường XYZ, Quận 7, TP.HCM'
        },
        status: 'completed',
        paymentStatus: 'paid',
        paidAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        cultivation: {
          startDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
          estimatedCompletionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          actualCompletionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          location: packages[1].location,
          progress: [
            {
              status: 'confirmed',
              description: 'Booking được xác nhận',
              reportedBy: users[0]._id
            },
            {
              status: 'completed',
              description: 'San hô đã hoàn thành quá trình phát triển',
              reportedBy: users[0]._id
            }
          ],
          finalReport: {
            completionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            growthData: {
              initialSize: 5,
              finalSize: 25,
              growthRate: 4,
              healthScore: 95
            },
            environmentalImpact: 'San hô đã tạo môi trường sống cho 15 loài cá nhỏ',
            notes: 'Quá trình phát triển rất tốt, san hô khỏe mạnh'
          }
        },
        certificate: {
          isGenerated: true,
          generatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      }
    ];

    for (const bookingData of sampleBookings) {
      const booking = new Booking(bookingData);
      await booking.save();
      
      // Update package booking count
      const package = await Package.findById(booking.package);
      package.currentBookings += booking.quantity;
      package.totalBookings += booking.quantity;
      package.totalRevenue += booking.totalAmount;
      await package.save();
      
      console.log(`🎫 Created booking: ${booking.bookingNumber}`);
    }

    // Create sample reviews
    const completedBooking = await Booking.findOne({ status: 'completed' });
    if (completedBooking) {
      const review = new Review({
        user: completedBooking.user,
        package: completedBooking.package,
        booking: completedBooking._id,
        rating: 5,
        title: 'Trải nghiệm tuyệt vời!',
        content: 'Dự án rất ý nghĩa, tôi đã nhận được báo cáo định kỳ về san hô của mình. Chất lượng dịch vụ tốt, đội ngũ chuyên nghiệp. Chắc chắn sẽ tham gia thêm các dự án khác.',
        detailedRatings: {
          serviceQuality: 5,
          communication: 5,
          value: 4,
          experience: 5
        },
        isVerified: true,
        moderationStatus: 'approved',
        moderatedBy: users[0]._id,
        moderatedAt: new Date()
      });
      await review.save();
      console.log(`⭐ Created review for booking: ${completedBooking.bookingNumber}`);
    }

    console.log('✅ Database seeding completed successfully!');
    
    // Print summary
    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`📦 Packages: ${packages.length}`);
    console.log(`🎫 Bookings: ${sampleBookings.length}`);
    console.log(`⭐ Reviews: 1`);
    console.log('\n🎯 Test Accounts:');
    console.log('Admin: admin@coralcultivation.com / admin123456');
    console.log('Customer: nguyenvanan@gmail.com / customer123');
    console.log('Business: info@ecotravelvn.com / business123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
};

// Run seeding
const runSeed = async () => {
  await connectDB();
  await seedDatabase();
  process.exit(0);
};

// Export for use in other files
module.exports = {
  seedDatabase,
  connectDB
};

// Run if this file is executed directly
if (require.main === module) {
  runSeed();
}