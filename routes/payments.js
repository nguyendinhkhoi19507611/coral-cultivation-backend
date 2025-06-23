// backend/routes/payments.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// MoMo payment configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create', 
  queryEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/query',
  redirectUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/booking/success`,
  ipnUrl: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/payments/momo/callback`,
  requestType: 'payWithMethod',
  extraData: ''
};

// @route   POST /api/payments/momo/create
// @desc    Create MoMo payment
// @access  Private
router.post('/momo/create', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID is required' 
      });
    }

    // Get booking details
    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id,
      paymentStatus: 'pending'
    }).populate('package user');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found or already paid' 
      });
    }

    // Validate booking amount
    if (!booking.totalAmount || booking.totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount'
      });
    }

    // Generate unique order info
    const orderId = `CR${booking.bookingNumber}_${Date.now()}`;
    const requestId = orderId;
    const orderInfo = `Thanh toan trong san ho - ${booking.package.name}`;
    const amount = booking.totalAmount;

    // Create signature for MoMo
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${MOMO_CONFIG.extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;
    
    const signature = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    // Prepare MoMo request body
    const requestBody = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: MOMO_CONFIG.redirectUrl,
      ipnUrl: MOMO_CONFIG.ipnUrl,
      extraData: MOMO_CONFIG.extraData,
      requestType: MOMO_CONFIG.requestType,
      signature: signature,
      lang: 'vi'
    };

    console.log('Creating MoMo payment:', {
      orderId,
      amount,
      bookingNumber: booking.bookingNumber
    });

    // Send request to MoMo
    const response = await axios.post(MOMO_CONFIG.endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('MoMo response:', response.data);

    if (response.data.resultCode === 0) {
      // Update booking with payment info
      booking.paymentId = orderId;
      booking.paymentMethod = 'momo';
      
      // Add notification
      booking.notifications.push({
        type: 'payment_initiated',
        message: 'Yêu cầu thanh toán đã được tạo. Vui lòng hoàn tất thanh toán.',
        sentAt: new Date()
      });

      await booking.save();

      res.json({
        success: true,
        paymentUrl: response.data.payUrl,
        orderId: orderId,
        amount: amount,
        qrCodeUrl: response.data.qrCodeUrl,
        deeplink: response.data.deeplink,
        deeplinkMiniApp: response.data.deeplinkMiniApp
      });
    } else {
      console.error('MoMo payment creation failed:', response.data);
      res.status(400).json({
        success: false,
        message: 'Failed to create MoMo payment',
        error: response.data.message || 'Unknown error',
        resultCode: response.data.resultCode
      });
    }

  } catch (error) {
    console.error('Create MoMo payment error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: 'Request timeout. Please try again.'
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error while creating payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/payments/momo/callback
// @desc    MoMo payment callback (IPN)
// @access  Public
router.post('/momo/callback', async (req, res) => {
  try {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = req.body;

    console.log('MoMo callback received:', {
      orderId,
      resultCode,
      message,
      transId,
      amount
    });

    // Verify signature
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid signature from MoMo callback');
      return res.status(400).json({ 
        RspCode: "97",
        Message: 'Invalid signature' 
      });
    }

    // Find booking by payment ID
    const booking = await Booking.findOne({ paymentId: orderId })
      .populate('package user');

    if (!booking) {
      console.error('Booking not found for payment ID:', orderId);
      return res.status(404).json({ 
        RspCode: "01",
        Message: 'Booking not found' 
      });
    }

    if (resultCode === 0) {
      // Payment successful
      if (booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'paid';
        booking.transactionId = transId;
        booking.paidAt = new Date();
        booking.status = 'confirmed';

        // Add success notification
        booking.notifications.push({
          type: 'booking_confirmed',
          message: 'Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.',
          sentAt: new Date()
        });

        await booking.save();

        // Update package statistics
        const package = await Package.findById(booking.package._id);
        if (package) {
          package.totalRevenue += booking.totalAmount;
          await package.save();
        }

        // Send confirmation email
        try {
          await sendEmail({
            to: booking.contactInfo.email,
            subject: 'Thanh toán thành công - Coral Cultivation',
            template: 'paymentSuccess',
            data: {
              name: booking.contactInfo.name,
              bookingNumber: booking.bookingNumber,
              packageName: booking.package.name,
              amount: booking.totalAmount,
              transactionId: transId,
              packageUrl: `${process.env.CLIENT_URL}/packages/${booking.package._id}`
            }
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }

        console.log(`Payment successful for booking: ${booking.bookingNumber}, Transaction: ${transId}`);
      }
    } else {
      // Payment failed
      if (booking.paymentStatus !== 'failed') {
        booking.paymentStatus = 'failed';
        
        // Add failure notification
        booking.notifications.push({
          type: 'payment_failed',
          message: `Thanh toán thất bại: ${message}. Vui lòng thử lại hoặc liên hệ hỗ trợ.`,
          sentAt: new Date()
        });

        await booking.save();

        console.log(`Payment failed for booking: ${booking.bookingNumber}, Reason: ${message}`);
      }
    }

    // Return success response to MoMo
    res.status(200).json({ 
      RspCode: "00",
      Message: "Confirm Success" 
    });

  } catch (error) {
    console.error('MoMo callback error:', error);
    res.status(500).json({
      RspCode: "99",
      Message: 'Server error while processing payment callback'
    });
  }
});

// @route   GET /api/payments/status/:orderId
// @desc    Check payment status
// @access  Private
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find booking by payment ID
    const booking = await Booking.findOne({
      paymentId: orderId,
      user: req.user._id
    }).populate('package');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment not found' 
      });
    }

    // Query MoMo for latest payment status
    try {
      const requestId = orderId;
      const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${requestId}`;
      
      const signature = crypto
        .createHmac('sha256', MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode: MOMO_CONFIG.partnerCode,
        accessKey: MOMO_CONFIG.accessKey,
        requestId: requestId,
        orderId: orderId,
        signature: signature,
        lang: 'vi'
      };

      const response = await axios.post(MOMO_CONFIG.queryEndpoint, requestBody, {
        timeout: 5000
      });

      res.json({
        success: true,
        booking: {
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          packageName: booking.package.name,
          transactionId: booking.transactionId,
          paidAt: booking.paidAt
        },
        momoStatus: response.data
      });

    } catch (momoError) {
      console.error('Error querying MoMo status:', momoError);
      
      // Return booking status even if MoMo query fails
      res.json({
        success: true,
        booking: {
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          packageName: booking.package.name,
          transactionId: booking.transactionId,
          paidAt: booking.paidAt
        },
        momoStatus: { error: 'Unable to query MoMo status' }
      });
    }

  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while checking payment status' 
    });
  }
});

// @route   POST /api/payments/bank-transfer/create
// @desc    Create bank transfer payment
// @access  Private
router.post('/bank-transfer/create', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id,
      paymentStatus: 'pending'
    }).populate('package');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found or already paid' 
      });
    }

    // Generate unique transfer code
    const transferCode = `CT${booking.bookingNumber}${Date.now().toString().slice(-4)}`;
    
    booking.paymentMethod = 'bank_transfer';
    booking.paymentId = transferCode;
    
    // Add notification
    booking.notifications.push({
      type: 'bank_transfer_info',
      message: 'Thông tin chuyển khoản đã được tạo. Vui lòng chuyển khoản theo hướng dẫn.',
      sentAt: new Date()
    });

    await booking.save();

    // Bank transfer details
    const bankInfo = {
      bankName: 'Ngân hàng Vietcombank',
      bankBranch: 'Chi nhánh TP.HCM',
      accountNumber: '1234567890123456',
      accountName: 'CORAL CULTIVATION VIETNAM',
      amount: booking.totalAmount,
      transferContent: `${transferCode} ${booking.contactInfo.name}`,
      note: 'Vui lòng chuyển khoản đúng số tiền và nội dung chuyển khoản để được xử lý tự động.',
      qrCode: `https://img.vietqr.io/image/970436-1234567890123456-compact.png?amount=${booking.totalAmount}&addInfo=${encodeURIComponent(transferCode + ' ' + booking.contactInfo.name)}&accountName=${encodeURIComponent('CORAL CULTIVATION VIETNAM')}`
    };

    // Send bank transfer instructions email
    try {
      await sendEmail({
        to: booking.contactInfo.email,
        subject: 'Hướng dẫn chuyển khoản - Coral Cultivation',
        template: 'bankTransferInstructions',
        data: {
          name: booking.contactInfo.name,
          bookingNumber: booking.bookingNumber,
          packageName: booking.package.name,
          amount: booking.totalAmount,
          transferCode: transferCode,
          bankInfo: bankInfo
        }
      });
    } catch (emailError) {
      console.error('Error sending bank transfer email:', emailError);
    }

    res.json({
      success: true,
      transferCode: transferCode,
      bankInfo: bankInfo,
      message: 'Thông tin chuyển khoản đã được gửi qua email'
    });

  } catch (error) {
    console.error('Create bank transfer error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating bank transfer' 
    });
  }
});

// @route   POST /api/payments/bank-transfer/confirm
// @desc    Confirm bank transfer payment (Admin only)
// @access  Admin
router.post('/bank-transfer/confirm', auth, adminAuth, async (req, res) => {
  try {
    const { bookingId, transactionId, notes, confirmationImages } = req.body;

    if (!bookingId || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and transaction ID are required'
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate('package user');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ 
        success: false,
        message: 'Payment already confirmed' 
      });
    }

    // Update booking
    booking.paymentStatus = 'paid';
    booking.transactionId = transactionId;
    booking.paidAt = new Date();
    booking.status = 'confirmed';

    // Add confirmation notification
    booking.notifications.push({
      type: 'booking_confirmed',
      message: 'Thanh toán chuyển khoản đã được xác nhận! Đơn hàng của bạn đã được kích hoạt.',
      sentAt: new Date()
    });

    // Add admin confirmation record
    booking.adminActions = booking.adminActions || [];
    booking.adminActions.push({
      action: 'payment_confirmed',
      performedBy: req.user._id,
      details: {
        transactionId,
        notes,
        confirmationImages: confirmationImages || []
      },
      performedAt: new Date()
    });

    await booking.save();

    // Update package revenue
    const package = await Package.findById(booking.package._id);
    if (package) {
      package.totalRevenue += booking.totalAmount;
      await package.save();
    }

    // Send confirmation email
    try {
      await sendEmail({
        to: booking.contactInfo.email,
        subject: 'Xác nhận thanh toán - Coral Cultivation',
        template: 'paymentConfirmed',
        data: {
          name: booking.contactInfo.name,
          bookingNumber: booking.bookingNumber,
          packageName: booking.package.name,
          amount: booking.totalAmount,
          transactionId: transactionId,
          notes: notes || 'Thanh toán đã được xác nhận thành công'
        }
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      booking: {
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        transactionId: booking.transactionId,
        paidAt: booking.paidAt
      }
    });

  } catch (error) {
    console.error('Confirm bank transfer error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while confirming payment' 
    });
  }
});

// @route   GET /api/payments/history
// @desc    Get user payment history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentMethod, 
      startDate, 
      endDate 
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    
    if (status) filter.paymentStatus = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const payments = await Booking.find(filter)
      .populate('package', 'name images coralType location')
      .select('bookingNumber paymentMethod paymentStatus totalAmount transactionId paidAt createdAt package paymentId')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Booking.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      payments,
      summary,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching payment history' 
    });
  }
});

// @route   POST /api/payments/refund
// @desc    Process refund (Admin only)
// @access  Admin
router.post('/refund', auth, adminAuth, async (req, res) => {
  try {
    const { bookingId, refundAmount, reason, refundMethod = 'bank_transfer' } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate('package user');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot refund unpaid booking' 
      });
    }

    if (booking.status === 'refunded') {
      return res.status(400).json({ 
        success: false,
        message: 'Booking already refunded' 
      });
    }

    const finalRefundAmount = refundAmount || booking.totalAmount;

    // Validate refund amount
    if (finalRefundAmount > booking.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed booking amount'
      });
    }

    // Update booking
    booking.paymentStatus = 'refunded';
    booking.status = 'refunded';
    booking.cancellation = {
      reason: reason || 'Refund processed by admin',
      cancelledAt: new Date(),
      refundAmount: finalRefundAmount,
      refundMethod: refundMethod,
      refundProcessedAt: new Date(),
      processedBy: req.user._id
    };

    // Add refund notification
    booking.notifications.push({
      type: 'refund_processed',
      message: `Hoàn tiền ${finalRefundAmount.toLocaleString()} VND đã được xử lý. ${reason || ''}`,
      sentAt: new Date()
    });

    // Add admin action record
    booking.adminActions = booking.adminActions || [];
    booking.adminActions.push({
      action: 'refund_processed',
      performedBy: req.user._id,
      details: {
        refundAmount: finalRefundAmount,
        refundMethod,
        reason
      },
      performedAt: new Date()
    });

    await booking.save();

    // Update package capacity and revenue
    const package = await Package.findById(booking.package._id);
    if (package) {
      package.currentBookings = Math.max(0, package.currentBookings - booking.quantity);
      package.totalRevenue = Math.max(0, package.totalRevenue - booking.totalAmount);
      await package.save();
    }

    // Send refund notification email
    try {
      await sendEmail({
        to: booking.contactInfo.email,
        subject: 'Hoàn tiền thành công - Coral Cultivation',
        template: 'refundProcessed',
        data: {
          name: booking.contactInfo.name,
          bookingNumber: booking.bookingNumber,
          refundAmount: finalRefundAmount,
          refundMethod: refundMethod === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'MoMo',
          reason: reason || 'Hoàn tiền theo yêu cầu',
          processingTime: '3-5 ngày làm việc',
          supportEmail: 'support@coralcultivation.vn'
        }
      });
    } catch (emailError) {
      console.error('Error sending refund email:', emailError);
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        bookingNumber: booking.bookingNumber,
        refundAmount: finalRefundAmount,
        refundMethod,
        processedAt: booking.cancellation.refundProcessedAt
      }
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while processing refund' 
    });
  }
});

// @route   GET /api/payments/admin/pending
// @desc    Get pending payments for admin review
// @access  Admin
router.get('/admin/pending', auth, adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      paymentMethod = 'bank_transfer',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {
      paymentStatus: 'pending',
      paymentMethod: paymentMethod
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const pendingPayments = await Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('package', 'name coralType price')
      .select('bookingNumber contactInfo totalAmount paymentId createdAt user package paymentMethod')
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Booking.countDocuments(filter);

    // Get summary statistics
    const summary = await Booking.aggregate([
      { $match: { paymentStatus: 'pending' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      payments: pendingPayments,
      summary,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching pending payments' 
    });
  }
});

// @route   GET /api/payments/admin/statistics
// @desc    Get payment statistics for admin
// @access  Admin
router.get('/admin/statistics', auth, adminAuth, async (req, res) => {
  try {
    const { period = 'month', year = new Date().getFullYear() } = req.query;

    // Date range based on period
    let startDate, endDate;
    if (period === 'year') {
      startDate = new Date(year, 0, 1);
      endDate = new Date(parseInt(year) + 1, 0, 1);
    } else {
      startDate = new Date(year, new Date().getMonth(), 1);
      endDate = new Date(year, new Date().getMonth() + 1, 1);
    }

    // Overall statistics
    const overallStats = await Booking.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Payment method statistics
    const paymentMethodStats = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          averageAmount: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Revenue trends
    const revenueTrends = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paidAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'year' ? '%Y-%m' : '%Y-%m-%d',
              date: '$paidAt'
            }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      overall: overallStats,
      paymentMethods: paymentMethodStats,
      trends: revenueTrends,
      period,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment statistics'
    });
  }
});

module.exports = router;