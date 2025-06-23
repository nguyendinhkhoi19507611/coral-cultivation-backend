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
        description: 'Công ty du lịch sinh thái hàng đầu Việt Nam, chuyên về các tour bảo vệ môi trường và du lịch có trách nhiệm',
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
        description: 'Chuyên tour lặn biển và bảo vệ san hô. Đối tác của các tổ chức bảo tồn biển quốc tế',
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
        description: 'Tập đoàn đầu tư vào các dự án bảo tồn biển và phát triển bền vững',
        address: '789 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        website: 'https://oceanconservation.vn',
        logo: 'https://res.cloudinary.com/demo/image/upload/v1234567895/ocean-corp-logo.png'
      }
    }
  ],

  packages: [
    {
      name: 'Gói Trồng San Hô Staghorn - Nha Trang Premium',
      description: 'Tham gia bảo tồn san hô Staghorn tại vùng biển Nha Trang với công nghệ tiên tiến nhất. Đây là loài san hô quý hiếm có khả năng phát triển nhanh và tạo môi trường sống cho hơn 65 loài sinh vật biển khác nhau. Gói Premium bao gồm: theo dõi quá trình trồng bằng camera HD 24/7, báo cáo định kỳ với hình ảnh chất lượng cao, video 4K, dữ liệu khoa học chi tiết và chứng nhận hoàn thành có QR code xác thực. Bạn còn được tham gia các hoạt động trải nghiệm thực tế tại hiện trường.',
      shortDescription: 'Trồng san hô Staghorn tại Nha Trang với công nghệ giám sát 24/7 - Góp phần bảo vệ rạn san hô Việt Nam',
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
        'Chứng nhận bảo tồn có QR code và blockchain',
        'Theo dõi GPS vị trí san hô chính xác',
        'Ứng dụng mobile theo dõi real-time',
        'Tham quan thực tế 1 ngày (bao gồm thiết bị lặn)',
        'Báo cáo khoa học chi tiết từ chuyên gia',
        'Hỗ trợ 24/7 từ đội ngũ chăm sóc khách hàng'
      ],
      benefits: [
        'Bảo vệ đa dạng sinh học biển Việt Nam',
        'Chống xói mòn bờ biển tự nhiên',
        'Tạo môi trường sống cho 65+ loài cá nhiệt đới',
        'Góp phần chống biến đổi khí hậu (hấp thụ CO2)',
        'Phát triển du lịch sinh thái bền vững',
        'Hỗ trợ nghiên cứu khoa học biển',
        'Tạo việc làm cho cộng đồng địa phương',
        'Giáo dục ý thức bảo vệ môi trường'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/staghorn-main.jpg',
          caption: 'San hô Staghorn trưởng thành tại Nha Trang',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567891/staghorn-planting.jpg',
          caption: 'Quá trình trồng san hô Staghorn',
          isMain: false
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567892/staghorn-growth.jpg',
          caption: 'San hô Staghorn sau 3 tháng phát triển',
          isMain: false
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567893/staghorn-ecosystem.jpg',
          caption: 'Hệ sinh thái phong phú xung quanh san hô',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/staghorn-timelapse.mp4',
          title: 'Timelapse phát triển san hô Staghorn',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567894/video-thumb1.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Staghorn Nha Trang Premium - Bảo Tồn Biển Công Nghệ Cao',
      metaDescription: 'Tham gia trồng san hô Staghorn tại Nha Trang với công nghệ giám sát 24/7. Nhận chứng nhận blockchain, theo dõi real-time và góp phần bảo vệ đại dương.'
    },
    {
      name: 'Gói Trồng San Hô Brain Coral - Phú Quốc Deluxe',
      description: 'Bảo tồn san hô Brain Coral (san hô não) tại vùng biển trong xanh Phú Quốc với gói dịch vụ cao cấp nhất. Loài san hô này có hình dạng đặc biệt giống như bộ não người và có tuổi thọ cực kỳ cao, có thể sống hàng trăm năm. Dự án này không chỉ giúp phục hồi hệ sinh thái rạn san hô mà còn tạo nơi trú ẩn cho hàng nghìn loài cá nhiệt đới quý hiếm. Gói Deluxe bao gồm nghiên cứu khoa học chuyên sâu, báo cáo DNA san hô và chương trình giáo dục môi trường.',
      shortDescription: 'Bảo tồn san hô Brain Coral tại Phú Quốc - Loài san hô có tuổi thọ hàng trăm năm với nghiên cứu DNA',
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
        'Video 360° môi trường san hô immersive',
        'Chứng nhận cao cấp với hologram chống giả',
        'Ứng dụng AR/VR theo dõi real-time',
        'Tour lặn ngắm san hô VIP 2 ngày 1 đêm',
        'Thư viện ảnh độ phân giải ultra-high',
        'Tư vấn khoa học từ tiến sĩ sinh học biển',
        'Chương trình giáo dục cho gia đình',
        'Bảo hiểm san hô trong suốt quá trình'
      ],
      benefits: [
        'Bảo tồn loài san hô cực quý hiếm',
        'Tạo rạn san hô nhân tạo bền vững',
        'Đóng góp cho nghiên cứu khoa học thế giới',
        'Phát triển ngành du lịch lặn cao cấp',
        'Giáo dục bảo vệ môi trường thế hệ trẻ',
        'Tạo carbon credit cho doanh nghiệp',
        'Hỗ trợ cộng đồng ngư dân địa phương',
        'Nghiên cứu khả năng chống chịu khí hậu'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567895/brain-coral-main.jpg',
          caption: 'San hô Brain Coral phát triển mạnh tại Phú Quốc',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567896/brain-coral-dna.jpg',
          caption: 'Nghiên cứu DNA san hô trong phòng thí nghiệm',
          isMain: false
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567897/brain-coral-ecosystem.jpg',
          caption: 'Hệ sinh thái đa dạng xung quanh san hô não',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567891/brain-coral-360.mp4',
          title: 'Video 360° hệ sinh thái san hô não',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567898/video-thumb2.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Brain Coral Phú Quốc Deluxe - Bảo Tồn Với Nghiên Cứu DNA',
      metaDescription: 'Tham gia bảo tồn san hô Brain Coral tại Phú Quốc với nghiên cứu DNA chuyên sâu. Loài san hô quý hiếm tuổi thọ hàng trăm năm.'
    },
    {
      name: 'Gói Trồng San Hô Table Coral - Côn Đảo Elite',
      description: 'Khôi phục rạn san hô Table Coral (san hô bàn) tại khu bảo tồn biển Côn Đảo với dự án đẳng cấp thế giới. Đây là dự án đặc biệt được UNESCO hỗ trợ nhằm phục hồi hệ sinh thái biển sau tác động của biến đổi khí hậu. San hô Table có khả năng tạo nên những "thành phố dưới nước" cho hàng nghìn loài sinh vật biển, đặc biệt là các loài cá quý hiếm chỉ có ở vùng biển Việt Nam. Gói Elite bao gồm nghiên cứu với đại học quốc tế và công bố khoa học.',
      shortDescription: 'Khôi phục san hô Table Coral tại Côn Đảo - Dự án UNESCO tạo thành phố dưới nước',
      coralType: 'Table',
      coralSpecies: 'Acropora hyacinthus',
      location: {
        name: 'Khu bảo tồn biển Côn Đảo - UNESCO Marine Park',
        coordinates: {
          latitude: 8.6883,
          longitude: 106.6103
        },
        depth: '10-25 mét',
        waterTemperature: '26-29°C',
        visibility: '25-35 mét'
      },
      price: 1500000,
      duration: 24,
      maxCapacity: 50,
      features: [
        'Hợp tác nghiên cứu với UNESCO',
        'Giám sát bằng robot dưới nước AI',
        'Báo cáo khoa học xuất bản quốc tế',
        'Chứng nhận từ Vườn Quốc gia Côn Đảo',
        'Ứng dụng metaverse trải nghiệm san hô',
        'Chương trình eco-expedition 5 ngày 4 đêm',
        'Thư viện ảnh khoa học độ phân giải 8K',
        'Seminar khoa học hàng quý',
        'Mạng lưới chuyên gia quốc tế',
        'Carbon offset certificate chính thức'
      ],
      benefits: [
        'Phục hồi hệ sinh thái UNESCO',
        'Bảo vệ di sản thiên nhiên thế giới',
        'Nghiên cứu khoa học hàng đầu châu Á',
        'Phát triển du lịch bền vững đẳng cấp',
        'Giáo dục môi trường cộng đồng quốc tế',
        'Tạo carbon credit có giá trị cao',
        'Bảo tồn loài đặc hữu Việt Nam',
        'Ứng phó với biến đổi khí hậu toàn cầu'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567899/table-coral-main.jpg',
          caption: 'San hô Table Coral rộng lớn tại Côn Đảo',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567900/table-coral-robot.jpg',
          caption: 'Robot AI giám sát san hô 24/7',
          isMain: false
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567901/table-coral-research.jpg',
          caption: 'Nghiên cứu khoa học chuyên sâu',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567892/table-coral-city.mp4',
          title: 'Thành phố dưới nước của san hô Table',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567902/video-thumb3.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Trồng San Hô Table Coral Côn Đảo Elite - Dự Án UNESCO Đẳng Cấp Thế Giới',
      metaDescription: 'Tham gia dự án UNESCO phục hồi san hô Table Coral tại Côn Đảo. Nghiên cứu với robot AI và công bố khoa học quốc tế.'
    },
    {
      name: 'Gói Trồng San Hô Mềm - Hạ Long Heritage',
      description: 'Dự án bảo tồn san hô mềm độc đáo tại vịnh Hạ Long, di sản thiên nhiên thế giới được UNESCO công nhận. San hô mềm có khả năng lọc nước biển tự nhiên và tạo môi trường trong lành cho các loài sinh vật, đặc biệt quan trọng trong việc duy trì chất lượng nước của vịnh. Đây là cơ hội để bạn góp phần bảo vệ di sản thiên nhiên thế giới mà hàng triệu du khách quốc tế đến chiêm ngưỡng mỗi năm.',
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
        'Chứng nhận UNESCO World Heritage',
        'Ứng dụng mobile tracking thân thiện',
        'Tour du thuyền Hạ Long 1 ngày',
        'Thăm quan hang động Thần Tiên',
        'Bữa trưa truyền thống trên thuyền',
        'Guide chuyên nghiệp song ngữ',
        'Kit quà tặng lưu niệm'
      ],
      benefits: [
        'Bảo vệ di sản UNESCO',
        'Cải thiện chất lượng nước biển vịnh',
        'Tăng đa dạng sinh học vùng di sản',
        'Phát triển du lịch xanh bền vững',
        'Giáo dục ý thức môi trường toàn cầu',
        'Hỗ trợ cộng đồng đánh cá địa phương',
        'Nghiên cứu san hô vùng ôn đới',
        'Bảo tồn cảnh quan thiên nhiên'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567903/soft-coral-main.jpg',
          caption: 'San hô mềm nhiều màu sắc tại Hạ Long',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567904/soft-coral-halong.jpg',
          caption: 'Vịnh Hạ Long - di sản thiên nhiên thế giới',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567893/soft-coral-heritage.mp4',
          title: 'San hô mềm trong di sản Hạ Long',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567905/video-thumb4.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: false,
      metaTitle: 'Trồng San Hô Mềm Hạ Long Heritage - Bảo Vệ Di Sản UNESCO',
      metaDescription: 'Tham gia bảo tồn san hô mềm tại vịnh Hạ Long di sản UNESCO. Góp phần bảo vệ di sản thiên nhiên thế giới và phát triển du lịch bền vững.'
    },
    {
      name: 'Gói Trồng San Hô Pillar - Quy Nhon Explorer',
      description: 'Khám phá và bảo tồn san hô Pillar (san hô cột) tại vùng biển Quy Nhon, một trong những loài san hô đặc biệt có hình dạng cột cao và tạo cấu trúc 3D phức tạp dưới nước. Đây là dự án tiên phong trong việc ứng dụng công nghệ in 3D để tạo khung san hô nhân tạo, giúp tăng tốc quá trình phục hồi rạn san hô. Gói Explorer phù hợp cho những ai yêu thích khám phá và muốn trải nghiệm công nghệ mới nhất.',
      shortDescription: 'Bảo tồn san hô Pillar tại Quy Nhon với công nghệ in 3D - Trải nghiệm khám phá mới',
      coralType: 'Pillar',
      coralSpecies: 'Dendrogyra cylindrus',
      location: {
        name: 'Vùng biển Quy Nhon - Bình Định',
        coordinates: {
          latitude: 13.7730,
          longitude: 109.2238
        },
        depth: '6-18 mét',
        waterTemperature: '25-29°C',
        visibility: '18-28 mét'
      },
      price: 580000,
      duration: 10,
      maxCapacity: 120,
      features: [
        'Công nghệ in 3D khung san hô',
        'Báo cáo tiến độ với mô hình 3D',
        'Tour khám phá bằng tàu ngầm mini',
        'Workshop về công nghệ biển',
        'Chứng nhận Innovation Certificate',
        'App game AR săn tìm san hô',
        'Video drone quay từ trên cao',
        'Tham gia thí nghiệm khoa học',
        'Mentor 1-1 với nhà khoa học'
      ],
      benefits: [
        'Ứng dụng công nghệ tiên tiến',
        'Tăng tốc phục hồi rạn san hô',
        'Tạo cấu trúc 3D phức tạp dưới nước',
        'Nghiên cứu sinh học cấu trúc',
        'Phát triển ngành du lịch khoa học',
        'Giáo dục STEM cho học sinh',
        'Innovation trong bảo tồn biển',
        'Hỗ trợ startup công nghệ xanh'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567906/pillar-coral-main.jpg',
          caption: 'San hô Pillar với cấu trúc cột độc đáo',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567907/pillar-coral-3d.jpg',
          caption: 'Công nghệ in 3D khung san hô',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567894/pillar-coral-tech.mp4',
          title: 'Công nghệ 3D trong bảo tồn san hô',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567908/video-thumb5.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: false,
      metaTitle: 'Trồng San Hô Pillar Quy Nhon Explorer - Công Nghệ In 3D Tiên Phong',
      metaDescription: 'Khám phá bảo tồn san hô Pillar tại Quy Nhon với công nghệ in 3D. Trải nghiệm tàu ngầm mini và workshop công nghệ biển.'
    },
    {
      name: 'Gói Trồng San Hô Elkhorn - Vũng Tàu Pioneer',
      description: 'Dự án tiên phong trồng san hô Elkhorn (san hô sừng nai) tại vùng biển Vũng Tàu, gần với TP.HCM để thuận tiện cho các gia đình và doanh nghiệp tham gia. San hô Elkhorn có hình dạng như sừng nai và là một trong những loài san hô phát triển nhanh nhất, có thể tăng trưởng lên đến 25cm mỗi năm. Dự án Pioneer này được thiết kế đặc biệt cho những người lần đầu tham gia bảo tồn san hô, với hướng dẫn chi tiết và hỗ trợ tận tình.',
      shortDescription: 'Trồng san hô Elkhorn tại Vũng Tàu - Dự án tiên phong cho người mới bắt đầu',
      coralType: 'Elkhorn',
      coralSpecies: 'Acropora palmata',
      location: {
        name: 'Vùng biển Vũng Tàu - Bà Rịa Vũng Tàu',
        coordinates: {
          latitude: 10.3460,
          longitude: 107.0843
        },
        depth: '4-14 mét',
        waterTemperature: '26-30°C',
        visibility: '12-22 mét'
      },
      price: 420000,
      duration: 5,
      maxCapacity: 180,
      features: [
        'Hướng dẫn chi tiết cho người mới',
        'Báo cáo đơn giản dễ hiểu',
        'Video giáo dục về san hô',
        'Tour tham quan 1 ngày từ TP.HCM',
        'Chứng nhận Pioneer Certificate',
        'Ứng dụng học tập tương tác',
        'Hotline hỗ trợ 24/7',
        'Cộng đồng online chia sẻ',
        'Workshop cuối tuần tại TP.HCM'
      ],
      benefits: [
        'Dễ tiếp cận cho người mới',
        'Gần TP.HCM tiện di chuyển',
        'Loài san hô phát triển nhanh',
        'Giáo dục ý thức môi trường',
        'Xây dựng cộng đồng bảo tồn',
        'Hỗ trợ du lịch địa phương',
        'Tạo không gian học tập',
        'Khuyến khích tham gia dài hạn'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567909/elkhorn-coral-main.jpg',
          caption: 'San hô Elkhorn hình sừng nai tại Vũng Tàu',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567910/elkhorn-coral-growth.jpg',
          caption: 'Tốc độ phát triển nhanh của san hô Elkhorn',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567895/elkhorn-coral-guide.mp4',
          title: 'Hướng dẫn cho người mới bắt đầu',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567911/video-thumb6.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: false,
      metaTitle: 'Trồng San Hô Elkhorn Vũng Tàu Pioneer - Dành Cho Người Mới Bắt Đầu',
      metaDescription: 'Dự án tiên phong trồng san hô Elkhorn tại Vũng Tàu. Dành cho người mới, gần TP.HCM, với hướng dẫn chi tiết và hỗ trợ tận tình.'
    },
    {
      name: 'Gói Trồng San Hô Tổng Hợp - Mixed Coral Garden',
      description: 'Gói đặc biệt cho những ai muốn trồng nhiều loại san hô khác nhau trong một dự án duy nhất. Mixed Coral Garden tạo ra một "khu vườn san hô" đa dạng với 5 loài san hô khác nhau: Staghorn, Brain, Table, Soft và Pillar. Đây là dự án tham vọng nhất, tạo ra một hệ sinh thái hoàn chỉnh dưới nước với sự đa dạng sinh học cao nhất.',
      shortDescription: 'Tạo khu vườn san hô đa dạng với 5 loài san hô khác nhau - Dự án tham vọng nhất',
      coralType: 'Mixed',
      coralSpecies: 'Multiple Species Garden',
      location: {
        name: 'Đa địa điểm - Nha Trang, Phú Quốc, Côn Đảo',
        coordinates: {
          latitude: 12.2388,
          longitude: 109.1967
        },
        depth: '5-25 mét',
        waterTemperature: '25-31°C',
        visibility: '15-35 mét'
      },
      price: 2500000,
      duration: 36,
      maxCapacity: 25,
      features: [
        'Trồng 5 loài san hô khác nhau',
        'Báo cáo từ 3 địa điểm',
        'Tour khám phá tất cả vị trí',
        'Nghiên cứu so sánh các loài',
        'Chứng nhận Master Conservationist',
        'Mạng lưới chuyên gia quốc tế',
        'Xuất bản nghiên cứu cá nhân',
        'Mentor cá nhân từ tiến sĩ',
        'Quyền đặt tên khu vườn san hô'
      ],
      benefits: [
        'Tạo hệ sinh thái hoàn chỉnh',
        'Đa dạng sinh học tối đa',
        'Nghiên cứu khoa học đa chiều',
        'Ảnh hưởng tích cực rộng lớn',
        'Mạng lưới chuyên gia toàn cầu',
        'Legacy bảo tồn lâu dài',
        'Giáo dục cộng đồng sâu rộng',
        'Đóng góp cho khoa học thế giới'
      ],
      images: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567912/mixed-coral-garden.jpg',
          caption: 'Khu vườn san hô đa dạng sinh học',
          isMain: true
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567913/mixed-coral-map.jpg',
          caption: 'Bản đồ các vị trí trồng san hô',
          isMain: false
        }
      ],
      videos: [
        {
          url: 'https://res.cloudinary.com/demo/video/upload/v1234567896/mixed-coral-ecosystem.mp4',
          title: 'Hệ sinh thái đa dạng của khu vườn san hô',
          thumbnail: 'https://res.cloudinary.com/demo/image/upload/v1234567914/video-thumb7.jpg'
        }
      ],
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      status: 'active',
      featured: true,
      metaTitle: 'Khu Vườn San Hô Tổng Hợp - Mixed Coral Garden Master Program',
      metaDescription: 'Tạo khu vườn san hô đa dạng với 5 loài khác nhau tại 3 địa điểm. Dự án tham vọng nhất cho Master Conservationist.'
    }
  ]
};

// Enhanced sample bookings and experiences data
const createSampleBookings = async (users, packages) => {
  const admin = users.find(u => u.role === 'admin');
  const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
  const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
  const customer3 = users.find(u => u.email === 'lehoangminh@gmail.com');
  const customer4 = users.find(u => u.email === 'phamthithu@gmail.com');
  const business1 = users.find(u => u.email === 'info@ecotravelvn.com');
  const business2 = users.find(u => u.email === 'contact@greenoceantours.vn');
  const business3 = users.find(u => u.email === 'partnership@oceanconservation.vn');

  const sampleBookings = [
    // Booking 1 - Customer1 - Staghorn - Growing
    {
      user: customer1._id,
      package: packages[0]._id, // Staghorn Nha Trang
      quantity: 2,
      unitPrice: packages[0].price,
      contactInfo: {
        name: customer1.name,
        email: customer1.email,
        phone: customer1.phone,
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
            date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            status: 'processing',
            description: 'Đã chọn vị trí trồng tối ưu và chuẩn bị mảnh san hô giống',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567916/progress1-2.jpg'],
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            status: 'growing',
            description: 'San hô đã được đặt thành công và bắt đầu quá trình phát triển',
            images: [
              'https://res.cloudinary.com/demo/image/upload/v1234567917/progress1-3.jpg',
              'https://res.cloudinary.com/demo/image/upload/v1234567918/progress1-4.jpg'
            ],
            videos: ['https://res.cloudinary.com/demo/video/upload/v1234567897/progress1-video.mp4'],
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 'growing',
            description: 'San hô phát triển rất tốt, đã có 5 loài cá nhỏ đến sinh sống',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567919/progress1-5.jpg'],
            reportedBy: admin._id
          }
        ],
        environmentalData: {
          waterTemperature: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), value: 28.5, unit: '°C' },
            { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), value: 29.2, unit: '°C' },
            { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), value: 28.8, unit: '°C' }
          ],
          phLevel: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), value: 8.1 },
            { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), value: 8.2 },
            { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), value: 8.0 }
          ],
          visibility: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), value: 18, unit: 'mét' },
            { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), value: 22, unit: 'mét' },
            { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), value: 20, unit: 'mét' }
          ]
        }
      },
      experienceBookings: [
        {
          type: 'site_visit',
          title: 'Tham quan thực tế san hô Staghorn',
          description: 'Tham quan và chụp ảnh cùng san hô của bạn tại Nha Trang',
          scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          duration: { hours: 4, minutes: 0 },
          maxParticipants: 6,
          currentParticipants: 2,
          participants: [
            {
              name: customer1.name,
              email: customer1.email,
              phone: customer1.phone,
              age: 35,
              emergencyContact: {
                name: 'Nguyễn Thị Lan',
                phone: '0902345678',
                relationship: 'Vợ'
              }
            }
          ],
          location: {
            name: 'Hòn Mun, Nha Trang',
            coordinates: { latitude: 12.2388, longitude: 109.1967 },
            meetingPoint: 'Cảng Du thuyền Ana Marina',
            transportation: 'Tàu cao tốc'
          },
          equipment: [
            { item: 'Mặt nạ lặn', quantity: 6, provided: true },
            { item: 'Ống thở', quantity: 6, provided: true },
            { item: 'Chân vịt', quantity: 6, provided: true },
            { item: 'Áo phao', quantity: 6, provided: true }
          ],
          guide: admin._id,
          status: 'scheduled',
          price: 0,
          notes: 'Bao gồm trong gói Premium'
        }
      ],
      notifications: [
        {
          type: 'booking_confirmed',
          title: 'Booking được xác nhận',
          message: 'Cảm ơn bạn đã tham gia dự án bảo tồn san hô! Chúng tôi sẽ bắt đầu trồng san hô trong vài ngày tới.',
          priority: 'medium',
          sentAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000)
        },
        {
          type: 'cultivation_started',
          title: 'Bắt đầu trồng san hô',
          message: 'San hô Staghorn của bạn đã được trồng tại vị trí tối ưu. Hãy theo dõi tiến độ phát triển!',
          priority: 'high',
          sentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
        },
        {
          type: 'progress_update',
          title: 'Cập nhật tiến độ',
          message: 'San hô của bạn đang phát triển tốt và đã thu hút 5 loài cá đến sinh sống!',
          priority: 'medium',
          sentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          isRead: false
        },
        {
          type: 'experience_scheduled',
          title: 'Trải nghiệm đã được lên lịch',
          message: 'Chuyến tham quan thực tế của bạn đã được lên lịch vào tháng tới. Hãy chuẩn bị cho chuyến phiêu lưu!',
          priority: 'high',
          sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          isRead: false,
          actionRequired: true,
          actionUrl: '/experiences'
        }
      ]
    },

    // Booking 2 - Customer2 - Brain Coral - Completed
    {
      user: customer2._id,
      package: packages[1]._id, // Brain Coral Phú Quốc
      quantity: 1,
      unitPrice: packages[1].price,
      contactInfo: {
        name: customer2.name,
        email: customer2.email,
        phone: customer2.phone,
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
            date: new Date(Date.now() - 450 * 24 * 60 * 60 * 1000),
            status: 'growing',
            description: 'San hô bắt đầu phát triển và tạo cấu trúc não',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567920/progress2-1.jpg'],
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
            status: 'growing',
            description: 'San hô đã phát triển 50% và thu hút nhiều sinh vật biển',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567921/progress2-2.jpg'],
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            status: 'completed',
            description: 'San hô đã hoàn thành quá trình phát triển và tạo thành hệ sinh thái nhỏ',
            images: [
              'https://res.cloudinary.com/demo/image/upload/v1234567922/progress2-final1.jpg',
              'https://res.cloudinary.com/demo/image/upload/v1234567923/progress2-final2.jpg'
            ],
            videos: ['https://res.cloudinary.com/demo/video/upload/v1234567898/progress2-final.mp4'],
            reportedBy: admin._id
          }
        ],
        finalReport: {
          completionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          finalImages: [
            'https://res.cloudinary.com/demo/image/upload/v1234567924/final-report2-1.jpg',
            'https://res.cloudinary.com/demo/image/upload/v1234567925/final-report2-2.jpg'
          ],
          finalVideo: 'https://res.cloudinary.com/demo/video/upload/v1234567899/final-report2.mp4',
          growthData: {
            initialSize: 8,
            finalSize: 45,
            growthRate: 2.5,
            healthScore: 98
          },
          environmentalImpact: 'San hô đã tạo môi trường sống cho 28 loài sinh vật biển, bao gồm 15 loài cá nhiệt đới và 13 loài giáp xác',
          notes: 'Dự án thành công vượt mong đợi. San hô Brain Coral đã phát triển thành một hệ sinh thái mini rất đa dạng.'
        }
      },
      experienceBookings: [
        {
          type: 'diving',
          title: 'Tour lặn VIP ngắm san hô hoàn thành',
          description: 'Lặn biển chuyên nghiệp để ngắm san hô Brain Coral đã hoàn thành',
          scheduledDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          duration: { hours: 6, minutes: 0 },
          maxParticipants: 4,
          currentParticipants: 2,
          participants: [
            {
              name: customer2.name,
              email: customer2.email,
              phone: customer2.phone,
              age: 42,
              divingLevel: 'intermediate',
              emergencyContact: {
                name: 'Trần Văn Nam',
                phone: '0903456789',
                relationship: 'Chồng'
              }
            }
          ],
          location: {
            name: 'An Thới, Phú Quốc',
            coordinates: { latitude: 10.2899, longitude: 103.9840 },
            meetingPoint: 'Resort JW Marriott Phu Quoc',
            transportation: 'Speedboat VIP'
          },
          guide: admin._id,
          status: 'completed',
          price: 0,
          actualStartTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          actualEndTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
          experiencePhotos: [
            'https://res.cloudinary.com/demo/image/upload/v1234567926/experience2-1.jpg',
            'https://res.cloudinary.com/demo/image/upload/v1234567927/experience2-2.jpg'
          ],
          experienceVideos: ['https://res.cloudinary.com/demo/video/upload/v1234567900/experience2.mp4'],
          feedback: [
            {
              participant: customer2.name,
              rating: 5,
              comments: 'Trải nghiệm tuyệt vời! Được nhìn thấy san hô mình đã góp phần trồng thật cảm động.',
              submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
            }
          ],
          safetyBriefing: {
            completed: true,
            briefingBy: admin._id,
            briefingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            emergencyProcedures: 'Hoàn thành đầy đủ tập huấn an toàn lặn biển'
          }
        }
      ],
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
          message: 'Chúc mừng! San hô Brain Coral của bạn đã hoàn thành quá trình phát triển với kết quả tuyệt vời.',
          priority: 'high',
          sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
        },
        {
          type: 'certificate_ready',
          title: 'Chứng nhận đã sẵn sàng',
          message: 'Chứng nhận bảo tồn san hô của bạn đã được tạo và sẵn sàng để tải xuống.',
          priority: 'medium',
          sentAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
          actionRequired: true,
          actionUrl: '/certificates'
        }
      ]
    },

    // Booking 3 - Business1 - Corporate booking
    {
      user: business1._id,
      package: packages[2]._id, // Table Coral Côn Đảo
      quantity: 10,
      unitPrice: packages[2].price,
      contactInfo: {
        name: business1.businessInfo.companyName,
        email: business1.email,
        phone: business1.phone,
        address: business1.businessInfo.address,
        specialRequests: 'Cần báo cáo CSR chi tiết cho báo cáo thường niên. Muốn tổ chức sự kiện team building tại địa điểm dự án.'
      },
      businessBooking: {
        isBusinessBooking: true,
        businessName: business1.businessInfo.companyName,
        referralCode: business1.businessInfo.referralCode,
        groupSize: 25,
        corporateDiscount: 15
      },
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 700 * 24 * 60 * 60 * 1000), // 24 months
        location: packages[2].location,
        progress: [
          {
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 'confirmed',
            description: 'Dự án corporate bảo tồn san hô Table Coral được khởi động với quy mô lớn',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567929/progress3-1.jpg'],
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            status: 'processing',
            description: 'Robot AI đã được triển khai để giám sát 24/7. Tất cả 10 vị trí trồng đã được chuẩn bị',
            images: [
              'https://res.cloudinary.com/demo/image/upload/v1234567930/progress3-2.jpg',
              'https://res.cloudinary.com/demo/image/upload/v1234567931/robot-ai.jpg'
            ],
            reportedBy: admin._id
          }
        ]
      },
      experienceBookings: [
        {
          type: 'education_tour',
          title: 'Corporate CSR Education Tour',
          description: 'Tour giáo dục về bảo tồn biển dành cho nhân viên và đối tác',
          scheduledDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          duration: { hours: 8, minutes: 0 },
          maxParticipants: 25,
          currentParticipants: 0,
          participants: [],
          location: {
            name: 'Côn Đảo National Park',
            coordinates: { latitude: 8.6883, longitude: 106.6103 },
            meetingPoint: 'Côn Đảo Airport',
            transportation: 'Charter flight + boat'
          },
          equipment: [
            { item: 'Safety vest', quantity: 25, provided: true },
            { item: 'Educational materials', quantity: 25, provided: true },
            { item: 'Underwater camera', quantity: 5, provided: true }
          ],
          guide: admin._id,
          status: 'scheduled',
          price: 0,
          notes: 'Bao gồm trong gói corporate, có presentation về CSR impact'
        }
      ],
      notifications: [
        {
          type: 'booking_confirmed',
          title: 'Corporate booking được xác nhận',
          message: 'Cảm ơn Eco Travel Vietnam đã tham gia dự án bảo tồn quy mô lớn. Chúng tôi sẽ cung cấp báo cáo CSR chi tiết.',
          priority: 'high',
          sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          isRead: true,
          readAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
        }
      ]
    },

    // Booking 4 - Customer3 - Multiple corals
    {
      user: customer3._id,
      package: packages[7]._id, // Mixed Coral Garden
      quantity: 1,
      unitPrice: packages[7].price,
      contactInfo: {
        name: customer3.name,
        email: customer3.email,
        phone: customer3.phone,
        address: '789 Đường Võ Văn Tần, Quận 3, TP.HCM',
        specialRequests: 'Là nghiên cứu sinh sinh học biển, muốn tham gia sâu vào quá trình nghiên cứu'
      },
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'momo',
      paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 1080 * 24 * 60 * 60 * 1000), // 36 months
        location: packages[7].location,
        progress: [
          {
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: 'processing',
            description: 'Bắt đầu dự án Master Conservationist với 5 loài san hô khác nhau',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567932/progress4-1.jpg'],
            reportedBy: admin._id
          }
        ]
      },
      notifications: [
        {
          type: 'cultivation_started',
          title: 'Dự án Master bắt đầu',
          message: 'Chào mừng bạn trở thành Master Conservationist! Dự án đặc biệt với 5 loài san hô đã bắt đầu.',
          priority: 'high',
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          isRead: false
        }
      ]
    },

    // Booking 5 - Customer4 - Pioneer package
    {
      user: customer4._id,
      package: packages[5]._id, // Elkhorn Vũng Tàu Pioneer
      quantity: 1,
      unitPrice: packages[5].price,
      contactInfo: {
        name: customer4.name,
        email: customer4.email,
        phone: customer4.phone,
        address: '321 Đường Lý Tự Trọng, Quận 1, TP.HCM'
      },
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'momo',
      cultivation: {
        estimatedCompletionDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000)
      },
      notifications: [
        {
          type: 'payment_reminder',
          title: 'Nhắc nhở thanh toán',
          message: 'Booking của bạn đang chờ thanh toán. Vui lòng hoàn tất để bắt đầu dự án bảo tồn.',
          priority: 'high',
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          isRead: false,
          actionRequired: true,
          actionUrl: '/payment'
        }
      ]
    },

    // Booking 6 - Business2 - Green Ocean Tours
    {
      user: business2._id,
      package: packages[3]._id, // Soft Coral Hạ Long
      quantity: 8,
      unitPrice: packages[3].price,
      contactInfo: {
        name: business2.businessInfo.companyName,
        email: business2.email,
        phone: business2.phone,
        address: business2.businessInfo.address,
        specialRequests: 'Kết hợp với tour du lịch của công ty, cần lịch trình linh hoạt'
      },
      businessBooking: {
        isBusinessBooking: true,
        businessName: business2.businessInfo.companyName,
        referralCode: business2.businessInfo.referralCode,
        groupSize: 20,
        corporateDiscount: 12
      },
      status: 'growing',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 130 * 24 * 60 * 60 * 1000),
        location: packages[3].location,
        progress: [
          {
            date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
            status: 'confirmed',
            description: 'Dự án bảo tồn san hô mềm tại di sản UNESCO Hạ Long',
            reportedBy: admin._id
          },
          {
            date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            status: 'growing',
            description: 'San hô mềm đang phát triển tốt trong môi trường di sản',
            images: ['https://res.cloudinary.com/demo/image/upload/v1234567933/progress6-1.jpg'],
            reportedBy: admin._id
          }
        ]
      }
    },

    // Booking 7 - Business3 - Ocean Conservation Corp
    {
      user: business3._id,
      package: packages[4]._id, // Pillar Coral Quy Nhon
      quantity: 15,
      unitPrice: packages[4].price,
      contactInfo: {
        name: business3.businessInfo.companyName,
        email: business3.email,
        phone: business3.phone,
        address: business3.businessInfo.address,
        specialRequests: 'Dự án nghiên cứu và phát triển công nghệ 3D, cần hỗ trợ kỹ thuật chuyên sâu'
      },
      businessBooking: {
        isBusinessBooking: true,
        businessName: business3.businessInfo.companyName,
        referralCode: business3.businessInfo.referralCode,
        groupSize: 30,
        corporateDiscount: 20
      },
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      paidAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      cultivation: {
        startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000),
        location: packages[4].location,
        progress: [
          {
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            status: 'processing',
            description: 'Triển khai công nghệ in 3D khung san hô tiên tiến',
            images: [
              'https://res.cloudinary.com/demo/image/upload/v1234567934/progress7-1.jpg',
              'https://res.cloudinary.com/demo/image/upload/v1234567935/3d-printing.jpg'
            ],
            reportedBy: admin._id
          }
        ]
      },
      experienceBookings: [
        {
          type: 'photography',
          title: 'Workshop công nghệ 3D và nhiếp ảnh dưới nước',
          description: 'Học cách sử dụng công nghệ 3D trong bảo tồn và chụp ảnh dưới nước',
          scheduledDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          duration: { hours: 6, minutes: 0 },
          maxParticipants: 12,
          currentParticipants: 0,
          location: {
            name: 'Quy Nhon Marine Research Center',
            coordinates: { latitude: 13.7730, longitude: 109.2238 },
            meetingPoint: 'Quy Nhon Beach Resort',
            transportation: 'Shuttle bus'
          },
          guide: admin._id,
          status: 'scheduled',
          price: 0,
          notes: 'Bao gồm thiết bị 3D và camera chuyên nghiệp'
        }
      ]
    }
  ];

  return sampleBookings;
};

// Create sample reviews
const createSampleReviews = async (users, packages, bookings) => {
  const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
  const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
  const business1 = users.find(u => u.email === 'info@ecotravelvn.com');
  const admin = users.find(u => u.role === 'admin');

  const completedBooking = bookings.find(b => b.status === 'completed');
  const growingBooking = bookings.find(b => b.status === 'growing');

  const sampleReviews = [
    // Review for completed booking
    {
      user: customer2._id,
      package: packages[1]._id, // Brain Coral
      booking: completedBooking._id,
      rating: 5,
      title: 'Trải nghiệm tuyệt vời và ý nghĩa!',
      content: 'Tôi đã theo dõi san hô Brain Coral của mình suốt 15 tháng và cảm thấy vô cùng hạnh phúc khi thấy nó phát triển mạnh mẽ. Đội ngũ báo cáo rất chuyên nghiệp, hình ảnh chất lượng cao và luôn cập nhật đều đặn. Trải nghiệm lặn ngắm san hô hoàn thành thực sự cảm động. Nhìn thấy hệ sinh thái nhỏ mà mình góp phần tạo ra với 28 loài sinh vật khác nhau thật tuyệt vời. Chắc chắn sẽ tham gia thêm các dự án khác.',
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
        },
        {
          url: 'https://res.cloudinary.com/demo/image/upload/v1234567937/review1-2.jpg',
          caption: 'Chứng nhận bảo tồn'
        }
      ],
      isVerified: true,
      moderationStatus: 'approved',
      moderatedBy: admin._id,
      moderatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      businessResponse: {
        content: 'Cảm ơn chị Bình đã tin tưởng và đồng hành cùng chúng tôi! Kết quả 28 loài sinh vật thực sự vượt mong đợi và là minh chứng cho sự thành công của dự án. Chúng tôi rất mong được đón tiếp chị trong các dự án sắp tới.',
        respondedBy: admin._id,
        respondedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      },
      helpfulCount: 8
    },

    // Review for growing booking
    {
      user: customer1._id,
      package: packages[0]._id, // Staghorn
      booking: growingBooking._id,
      rating: 4,
      title: 'Dự án chất lượng, theo dõi rất tốt',
      content: 'Mặc dù san hô của tôi vẫn đang trong quá trình phát triển nhưng tôi đã rất hài lòng với chất lượng dịch vụ. Camera HD 24/7 cho phép tôi theo dõi san hô mọi lúc, báo cáo hàng tuần rất chi tiết với hình ảnh đẹp. Đặc biệt ấn tượng với việc đã có 5 loài cá đến sinh sống. Ứng dụng mobile rất tiện dụng. Chỉ trừ điểm nhỏ là đôi khi hình ảnh bị mờ do thời tiết xấu.',
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
    },

    // Business review
    {
      user: business1._id,
      package: packages[2]._id, // Table Coral
      booking: bookings.find(b => b.user.toString() === business1._id.toString())._id,
      rating: 5,
      title: 'Đối tác CSR xuất sắc cho doanh nghiệp',
      content: 'Là doanh nghiệp du lịch, chúng tôi đã tìm được đối tác CSR lý tưởng. Dự án Table Coral tại Côn Đảo không chỉ có ý nghĩa bảo tồn mà còn tạo ra giá trị marketing tuyệt vời. Robot AI giám sát 24/7 rất ấn tượng, báo cáo khoa học chuyên sâu phù hợp cho báo cáo thường niên. Đội ngũ hỗ trợ doanh nghiệp rất chuyên nghiệp. Sẽ mở rộng hợp tác trong năm tới.',
      detailedRatings: {
        serviceQuality: 5,
        communication: 5,
        value: 5,
        experience: 5
      },
      isVerified: true,
      moderationStatus: 'approved',
      moderatedBy: admin._id,
      moderatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      businessResponse: {
        content: 'Cảm ơn Eco Travel Vietnam đã tin tưởng! Chúng tôi rất vui khi dự án không chỉ đạt mục tiêu bảo tồn mà còn hỗ trợ tốt cho chiến lược CSR của công ty. Chúng tôi đang chuẩn bị những dự án scale lớn hơn cho năm tới.',
        respondedBy: admin._id,
        respondedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      helpfulCount: 12
    }
  ];

  return sampleReviews;
};

// Create sample notifications
const createSampleNotifications = async (users, bookings) => {
  const customer1 = users.find(u => u.email === 'nguyenvanan@gmail.com');
  const customer2 = users.find(u => u.email === 'tranthibinh@gmail.com');
  const customer3 = users.find(u => u.email === 'lehoangminh@gmail.com');
  const business1 = users.find(u => u.email === 'info@ecotravelvn.com');
  const admin = users.find(u => u.role === 'admin');

  const sampleNotifications = [
    // System notifications
    {
      recipient: customer1._id,
      type: 'system_maintenance',
      title: '🔧 Bảo trì hệ thống',
      message: 'Hệ thống sẽ được bảo trì từ 2:00 - 4:00 sáng ngày mai để nâng cấp tính năng mới.',
      priority: 'medium',
      icon: 'wrench',
      color: 'blue',
      channels: ['in_app', 'email'],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sender: admin._id,
      senderType: 'admin',
      metadata: {
        maintenanceWindow: '2:00 - 4:00 AM',
        affectedServices: ['real-time tracking', 'notifications']
      }
    },

    // Promotional notification
    {
      recipient: customer1._id,
      type: 'promotion',
      title: '🎉 Ưu đãi mùa Xuân',
      message: 'Giảm 20% cho gói Soft Coral Hạ Long trong tháng 3. Cơ hội tuyệt vời để bảo vệ di sản UNESCO!',
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
      senderType: 'admin',
      metadata: {
        discount: 20,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        applicablePackages: ['soft-coral-ha-long']
      }
    },

    // Educational content
    {
      recipient: customer2._id,
      type: 'educational_content',
      title: '📚 Tại sao san hô lại quan trọng?',
      message: 'Khám phá 5 lý do tại sao san hô được gọi là "rừng nhiệt đới của đại dương" và tầm quan trọng của chúng với hệ sinh thái biển.',
      priority: 'low',
      icon: 'book',
      color: 'purple',
      actionButton: {
        text: 'Đọc bài viết',
        url: '/blog/why-corals-matter'
      },
      channels: ['in_app'],
      metadata: {
        category: 'marine-education',
        readingTime: '5 minutes'
      }
    },

    // Weather alert
    {
      recipient: business1._id,
      type: 'weather_alert',
      title: '⚠️ Cảnh báo thời tiết',
      message: 'Dự báo có gió mạnh tại khu vực Côn Đảo trong 48h tới. Có thể ảnh hưởng đến hoạt động giám sát.',
      priority: 'urgent',
      icon: 'cloud-rain',
      color: 'red',
      actionRequired: true,
      actionButton: {
        text: 'Xem chi tiết',
        url: '/weather/con-dao'
      },
      channels: ['in_app', 'email', 'sms'],
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      sender: admin._id,
      senderType: 'automated',
      metadata: {
        location: 'Côn Đảo',
        severity: 'moderate',
        windSpeed: '45-60 km/h',
        duration: '48 hours'
      }
    },

    // Community update
    {
      recipient: customer3._id,
      type: 'community_update',
      title: '🌊 Cập nhật cộng đồng',
      message: 'Tháng này cộng đồng đã trồng thành công 1,234 san hô mới! Bạn đã góp phần vào thành tựu tuyệt vời này.',
      priority: 'medium',
      icon: 'users',
      color: 'blue',
      actionButton: {
        text: 'Xem thống kê',
        url: '/community/stats'
      },
      channels: ['in_app'],
      metadata: {
        monthlyStats: {
          newCorals: 1234,
          activeProjects: 456,
          communityMembers: 789
        }
      }
    },

    // Certificate ready notification
    {
      recipient: customer2._id,
      type: 'certificate_ready',
      title: '🏆 Chứng nhận đã sẵn sàng',
      message: 'Chúc mừng! Chứng nhận bảo tồn san hô Brain Coral của bạn đã được tạo thành công.',
      priority: 'high',
      icon: 'award',
      color: 'gold',
      actionRequired: true,
      actionButton: {
        text: 'Tải chứng nhận',
        url: '/certificates/download'
      },
      channels: ['in_app', 'email'],
      relatedBooking: bookings.find(b => b.status === 'completed')?._id,
      metadata: {
        certificateType: 'conservation',
        downloadFormat: 'PDF',
        qrVerified: true
      }
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
        package.currentBookings += booking.quantity;
        package.totalBookings += booking.quantity;
        if (booking.paymentStatus === 'paid') {
          package.totalRevenue += booking.totalAmount;
        }
        await package.save();
        
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
    console.log(`   - Average booking value: ${Math.round(totalRevenue / createdBookings.filter(b => b.paymentStatus === 'paid').length).toLocaleString()} VND`);
    
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
    console.log('🔹 Customer1 (An): Has growing coral with scheduled experience');
    console.log('🔹 Customer2 (Bình): Has completed coral with certificate and review');
    console.log('🔹 Customer3 (Minh): Has Master program with mixed corals');
    console.log('🔹 Customer4 (Thu): Has pending payment for testing payment flow');
    console.log('🔹 Business1 (Eco Travel): Corporate booking with scheduled team event');
    console.log('🔹 Business2 (Green Ocean): Tourism business with multiple corals');
    console.log('🔹 Business3 (Ocean Corp): Tech company testing 3D printing integration');
    
    console.log('\n🔧 FEATURE TESTING:');
    console.log('✓ Payment flows (MoMo, Bank Transfer)');
    console.log('✓ Real-time notifications');
    console.log('✓ Experience booking and management');
    console.log('✓ Progress tracking with media');
    console.log('✓ Certificate generation');
    console.log('✓ Review and rating system');
    console.log('✓ Business/Corporate features');
    console.log('✓ Admin dashboard and analytics');
    console.log('✓ Multi-location coral projects');
    console.log('✓ Environmental data tracking');
    
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
      createdBy: admin._id
    });
    await soldOutPackage.save();
    
    // Create inactive package
    const inactivePackage = new Package({
      name: 'Gói Inactive - Testing', 
      description: 'Package for testing inactive functionality',
      shortDescription: 'Test inactive status',
      coralType: 'Brain',
      coralSpecies: 'Diploria labyrinthiformis',
      location: {
        name: 'Test Location',
        depth: '5-10m',
        waterTemperature: '26-30°C', 
        visibility: '15-20m'
      },
      price: 200000,
      duration: 6,
      maxCapacity: 50,
      status: 'inactive',
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2025-12-31'),
      createdBy: admin._id
    });
    await inactivePackage.save();
    
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
    
    // Create failed payment booking
    const failedBooking = new Booking({
      user: customer._id,
      package: inactivePackage._id,
      quantity: 1,
      unitPrice: inactivePackage.price,
      contactInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '0901234567'
      },
      status: 'pending',
      paymentStatus: 'failed',
      paymentMethod: 'momo'
    });
    await failedBooking.save();
    
    console.log('✅ Test scenarios created successfully');
    console.log('🔹 Sold out package created');
    console.log('🔹 Inactive package created');  
    console.log('🔹 Cancelled booking created');
    console.log('🔹 Failed payment booking created');
    
  } catch (error) {
    console.error('❌ Test scenarios creation failed:', error);
    throw error;
  }
};

// Performance test data creation
const createPerformanceTestData = async (userCount = 100, bookingCount = 500) => {
  try {
    console.log(`🚀 Creating performance test data: ${userCount} users, ${bookingCount} bookings...`);
    
    const admin = await User.findOne({ role: 'admin' });
    const packages = await Package.find({ status: 'active' });
    
    if (!admin || packages.length === 0) {
      console.log('❌ Need basic data first. Run main seeding.');
      return;
    }
    
    // Create users in batches
    const batchSize = 50;
    const userBatches = Math.ceil(userCount / batchSize);
    
    for (let batch = 0; batch < userBatches; batch++) {
      const usersToCreate = Math.min(batchSize, userCount - batch * batchSize);
      const users = [];
      
      for (let i = 0; i < usersToCreate; i++) {
        const userIndex = batch * batchSize + i;
        const hashedPassword = await bcrypt.hash('testuser123', 12);
        
        users.push({
          name: `Test User ${userIndex + 1}`,
          email: `testuser${userIndex + 1}@example.com`,
          password: hashedPassword,
          phone: `090${String(userIndex + 1).padStart(7, '0')}`,
          role: 'customer',
          isVerified: true,
          isActive: true
        });
      }
      
      await User.insertMany(users);
      console.log(`✅ Created user batch ${batch + 1}/${userBatches}`);
    }
    
    // Create bookings in batches
    const allUsers = await User.find({ role: 'customer' });
    const bookingBatches = Math.ceil(bookingCount / batchSize);
    
    for (let batch = 0; batch < bookingBatches; batch++) {
      const bookingsToCreate = Math.min(batchSize, bookingCount - batch * batchSize);
      const bookings = [];
      
      for (let i = 0; i < bookingsToCreate; i++) {
        const user = allUsers[Math.floor(Math.random() * allUsers.length)];
        const package = packages[Math.floor(Math.random() * packages.length)];
        const statuses = ['pending', 'confirmed', 'growing', 'completed'];
        const paymentStatuses = ['pending', 'paid', 'failed'];
        const paymentMethods = ['momo', 'bank_transfer'];
        
        const booking = {
          user: user._id,
          package: package._id,
          quantity: Math.floor(Math.random() * 3) + 1,
          unitPrice: package.price,
          contactInfo: {
            name: user.name,
            email: user.email,
            phone: user.phone
          },
          status: statuses[Math.floor(Math.random() * statuses.length)],
          paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          cultivation: {
            estimatedCompletionDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000)
          }
        };
        
        // Calculate total amount
        booking.totalAmount = booking.quantity * booking.unitPrice;
        
        if (booking.paymentStatus === 'paid') {
          booking.paidAt = new Date(booking.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        }
        
        bookings.push(booking);
      }
      
      await Booking.insertMany(bookings);
      console.log(`✅ Created booking batch ${batch + 1}/${bookingBatches}`);
    }
    
    console.log(`🎯 Performance test data created successfully!`);
    console.log(`📊 Total users: ${await User.countDocuments()}`);
    console.log(`📊 Total bookings: ${await Booking.countDocuments()}`);
    
  } catch (error) {
    console.error('❌ Performance test data creation failed:', error);
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
    
    // Ask if user wants to create performance test data
    if (process.argv.includes('--performance')) {
      const userCount = process.argv.includes('--users') ? 
        parseInt(process.argv[process.argv.indexOf('--users') + 1]) : 100;
      const bookingCount = process.argv.includes('--bookings') ? 
        parseInt(process.argv[process.argv.indexOf('--bookings') + 1]) : 500;
      
      await createPerformanceTestData(userCount, bookingCount);
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
  createPerformanceTestData,
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
    console.log('  --performance             Create performance test data');
    console.log('  --users <number>          Number of test users (default: 100)');
    console.log('  --bookings <number>       Number of test bookings (default: 500)');
    console.log('  --reset <collection>      Reset specific collection (users|packages|bookings|reviews|notifications|all)');
    console.log('\nExamples:');
    console.log('  node utils/seedData.js');
    console.log('  node utils/seedData.js --test-scenarios');
    console.log('  node utils/seedData.js --performance --users 200 --bookings 1000');
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