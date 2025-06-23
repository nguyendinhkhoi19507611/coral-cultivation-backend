# Backend Setup Commands

## 1. Tạo thư mục backend và cài đặt dependencies
mkdir coral-cultivation-backend
cd coral-cultivation-backend

# Khởi tạo npm project
npm init -y

# Cài đặt dependencies chính
npm install express mongoose bcryptjs jsonwebtoken cors dotenv multer cloudinary nodemailer qrcode pdf-lib moment joi helmet express-rate-limit morgan

# Cài đặt multer-storage-cloudinary
npm install multer-storage-cloudinary

# Cài đặt dev dependencies
npm install --save-dev nodemon

## 2. Tạo cấu trúc thư mục
mkdir models routes middleware utils uploads
mkdir models/schemas
mkdir utils/templates

## 3. Tạo file .env (cần cập nhật với thông tin thực tế)
cp .env.example .env

## 4. Khởi chạy MongoDB (nếu chưa có)
# Cài đặt MongoDB Community Edition hoặc sử dụng MongoDB Atlas

## 5. Chạy server
# Development mode
npm run dev

# Production mode
npm start

## 6. Tạo dữ liệu mẫu (optional)
npm run seed

## 7. Test API
# Kiểm tra health check
curl http://localhost:5000/api/health

## Cấu trúc thư mục backend:
.
├── models/
│   ├── User.js
│   ├── Package.js
│   ├── Booking.js
│   └── Review.js
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── packages.js
│   ├── bookings.js
│   ├── reviews.js
│   ├── admin.js
│   └── payments.js
├── middleware/
│   ├── auth.js
│   └── upload.js
├── utils/
│   ├── email.js
│   ├── certificate.js
│   ├── cloudinary.js
│   └── seedData.js
├── uploads/ (for local storage if needed)
├── .env
├── .gitignore
├── package.json
└── server.js