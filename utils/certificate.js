const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const cloudinary = require('./cloudinary');

// Generate QR Code
const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(data));
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw error;
  }
};

// Generate certificate PDF
const generateCertificatePDF = async (certificateData) => {
  try {
    const {
      bookingNumber,
      recipientName,
      packageName,
      coralType,
      location,
      completionDate,
      quantity
    } = certificateData;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]); // Landscape A4
    
    // Get fonts
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const { width, height } = page.getSize();
    
    // Colors
    const primaryColor = rgb(0.1, 0.4, 0.8); // Blue
    const accentColor = rgb(0.0, 0.7, 0.5); // Teal
    const textColor = rgb(0.2, 0.2, 0.2); // Dark gray
    
    // Draw border
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: primaryColor,
      borderWidth: 3
    });
    
    page.drawRectangle({
      x: 50,
      y: 50,
      width: width - 100,
      height: height - 100,
      borderColor: accentColor,
      borderWidth: 1
    });
    
    // Header
    page.drawText('🪸 CORAL CULTIVATION CERTIFICATE', {
      x: width / 2 - 180,
      y: height - 120,
      size: 24,
      font: timesRomanBoldFont,
      color: primaryColor
    });
    
    // Subtitle
    page.drawText('Certificate of Environmental Contribution', {
      x: width / 2 - 120,
      y: height - 150,
      size: 16,
      font: helveticaFont,
      color: accentColor
    });
    
    // Main content
    page.drawText('This is to certify that', {
      x: width / 2 - 80,
      y: height - 200,
      size: 14,
      font: timesRomanFont,
      color: textColor
    });
    
    page.drawText(recipientName.toUpperCase(), {
      x: width / 2 - (recipientName.length * 8),
      y: height - 240,
      size: 28,
      font: timesRomanBoldFont,
      color: primaryColor
    });
    
    page.drawText('has successfully contributed to coral reef conservation by sponsoring', {
      x: width / 2 - 220,
      y: height - 280,
      size: 14,
      font: timesRomanFont,
      color: textColor
    });
    
    page.drawText(`${quantity} ${coralType} coral(s)`, {
      x: width / 2 - 80,
      y: height - 310,
      size: 18,
      font: timesRomanBoldFont,
      color: accentColor
    });
    
    page.drawText(`in the ${location} marine sanctuary.`, {
      x: width / 2 - 120,
      y: height - 340,
      size: 14,
      font: timesRomanFont,
      color: textColor
    });
    
    // Package details
    page.drawText(`Package: ${packageName}`, {
      x: 100,
      y: height - 380,
      size: 12,
      font: helveticaFont,
      color: textColor
    });
    
    page.drawText(`Completion Date: ${new Date(completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, {
      x: 100,
      y: height - 400,
      size: 12,
      font: helveticaFont,
      color: textColor
    });
    
    page.drawText(`Certificate ID: ${bookingNumber}`, {
      x: 100,
      y: height - 420,
      size: 12,
      font: helveticaFont,
      color: textColor
    });
    
    // Impact statement
    page.drawText('Your contribution helps protect marine biodiversity and combat climate change.', {
      x: width / 2 - 240,
      y: height - 460,
      size: 12,
      font: timesRomanFont,
      color: textColor
    });
    
    page.drawText('Thank you for making a difference in ocean conservation!', {
      x: width / 2 - 180,
      y: height - 480,
      size: 12,
      font: timesRomanBoldFont,
      color: accentColor
    });
    
    // Signature area
    page.drawText('_________________________', {
      x: width - 300,
      y: 150,
      size: 12,
      font: helveticaFont,
      color: textColor
    });
    
    page.drawText('Marine Conservation Director', {
      x: width - 280,
      y: 130,
      size: 10,
      font: helveticaFont,
      color: textColor
    });
    
    page.drawText('Coral Cultivation Program', {
      x: width - 270,
      y: 115,
      size: 10,
      font: helveticaFont,
      color: textColor
    });
    
    // Footer
    page.drawText('🌊 Protecting our oceans, one coral at a time 🌊', {
      x: width / 2 - 150,
      y: 80,
      size: 12,
      font: timesRomanFont,
      color: primaryColor
    });
    
    // Generate QR code data
    const qrData = {
      certificateId: bookingNumber,
      recipient: recipientName,
      package: packageName,
      completionDate: completionDate,
      verificationUrl: `${process.env.CLIENT_URL}/verify-certificate/${bookingNumber}`
    };
    
    // Generate and embed QR code
    const qrCodeDataURL = await generateQRCode(qrData);
    const qrCodeImageBytes = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
    
    page.drawImage(qrCodeImage, {
      x: 100,
      y: 120,
      width: 80,
      height: 80
    });
    
    page.drawText('Scan to verify', {
      x: 105,
      y: 100,
      size: 8,
      font: helveticaFont,
      color: textColor
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return { pdfBytes, qrData };
    
  } catch (error) {
    console.error('Certificate PDF generation error:', error);
    throw error;
  }
};

// Upload certificate to cloudinary
const uploadCertificate = async (pdfBytes, bookingNumber) => {
  try {
    const base64PDF = Buffer.from(pdfBytes).toString('base64');
    const dataURI = `data:application/pdf;base64,${base64PDF}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'raw',
      public_id: `certificates/${bookingNumber}`,
      format: 'pdf'
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Certificate upload error:', error);
    throw error;
  }
};

// Main certificate generation function
const generateCertificate = async (certificateData) => {
  try {
    // Generate PDF
    const { pdfBytes, qrData } = await generateCertificatePDF(certificateData);
    
    // Upload to cloudinary
    const certificateUrl = await uploadCertificate(pdfBytes, certificateData.bookingNumber);
    
    // Generate QR code as data URL for storage
    const qrCodeDataURL = await generateQRCode(qrData);
    
    return {
      url: certificateUrl,
      qrCode: qrCodeDataURL,
      data: qrData
    };
    
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw error;
  }
};

// Verify certificate
const verifyCertificate = async (certificateId) => {
  try {
    const Booking = require('../models/Booking');
    
    const booking = await Booking.findOne({ bookingNumber: certificateId })
      .populate('package', 'name coralType location')
      .populate('user', 'name');
    
    if (!booking) {
      return { valid: false, message: 'Certificate not found' };
    }
    
    if (booking.status !== 'completed') {
      return { valid: false, message: 'Certificate not yet available' };
    }
    
    if (!booking.certificate.isGenerated) {
      return { valid: false, message: 'Certificate not generated' };
    }
    
    return {
      valid: true,
      certificate: {
        bookingNumber: booking.bookingNumber,
        recipientName: booking.contactInfo.name,
        packageName: booking.package.name,
        coralType: booking.package.coralType,
        location: booking.package.location.name,
        completionDate: booking.cultivation.actualCompletionDate,
        quantity: booking.quantity,
        generatedAt: booking.certificate.generatedAt
      }
    };
    
  } catch (error) {
    console.error('Certificate verification error:', error);
    return { valid: false, message: 'Verification failed' };
  }
};

// Generate business certificate (for corporate sponsors)
const generateBusinessCertificate = async (certificateData) => {
  try {
    const {
      businessName,
      contactPerson,
      totalSponsored,
      impactMetrics,
      logoUrl
    } = certificateData;
    
    // Create enhanced PDF for business
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([792, 612]);
    
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const { width, height } = page.getSize();
    
    // Enhanced design for business certificates
    const primaryColor = rgb(0.0, 0.3, 0.6);
    const goldColor = rgb(0.8, 0.7, 0.0);
    const textColor = rgb(0.1, 0.1, 0.1);
    
    // Premium border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: goldColor,
      borderWidth: 4
    });
    
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: primaryColor,
      borderWidth: 2
    });
    
    // Header
    page.drawText('🏆 CORPORATE CONSERVATION PARTNERSHIP', {
      x: width / 2 - 200,
      y: height - 100,
      size: 22,
      font: timesRomanBoldFont,
      color: primaryColor
    });
    
    page.drawText('Certificate of Environmental Leadership', {
      x: width / 2 - 140,
      y: height - 130,
      size: 16,
      font: helveticaFont,
      color: goldColor
    });
    
    // Business recognition
    page.drawText('This certificate recognizes', {
      x: width / 2 - 90,
      y: height - 180,
      size: 14,
      font: timesRomanFont,
      color: textColor
    });
    
    page.drawText(businessName.toUpperCase(), {
      x: width / 2 - (businessName.length * 6),
      y: height - 220,
      size: 24,
      font: timesRomanBoldFont,
      color: primaryColor
    });
    
    page.drawText('for outstanding commitment to marine conservation', {
      x: width / 2 - 180,
      y: height - 260,
      size: 14,
      font: timesRomanFont,
      color: textColor
    });
    
    // Impact metrics
    page.drawText(`Total Coral Sponsorship: ${totalSponsored} corals`, {
      x: 100,
      y: height - 320,
      size: 14,
      font: timesRomanBoldFont,
      color: primaryColor
    });
    
    if (impactMetrics) {
      page.drawText(`Carbon Offset: ${impactMetrics.carbonOffset || 'N/A'} kg CO₂`, {
        x: 100,
        y: height - 345,
        size: 12,
        font: helveticaFont,
        color: textColor
      });
      
      page.drawText(`Marine Habitat Protected: ${impactMetrics.habitatArea || 'N/A'} m²`, {
        x: 100,
        y: height - 365,
        size: 12,
        font: helveticaFont,
        color: textColor
      });
    }
    
    // Contact person
    if (contactPerson) {
      page.drawText(`Partnership Contact: ${contactPerson}`, {
        x: 100,
        y: height - 400,
        size: 12,
        font: helveticaFont,
        color: textColor
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    return { pdfBytes };
    
  } catch (error) {
    console.error('Business certificate generation error:', error);
    throw error;
  }
};

module.exports = {
  generateCertificate,
  generateBusinessCertificate,
  verifyCertificate,
  generateQRCode
};