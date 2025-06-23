const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  verification: (data) => ({
    subject: 'Verify Your Email - Coral Cultivation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🪸 Coral Cultivation</h1>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333;">Welcome ${data.name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for joining our coral cultivation community. Please verify your email address to complete your registration.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link: <br>
            <a href="${data.verificationUrl}">${data.verificationUrl}</a>
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">© 2024 Coral Cultivation. Protecting our oceans, one coral at a time.</p>
        </div>
      </div>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset - Coral Cultivation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🪸 Coral Cultivation</h1>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${data.name}, we received a request to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" 
               style="background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">© 2024 Coral Cultivation. Protecting our oceans, one coral at a time.</p>
        </div>
      </div>
    `
  }),

  bookingConfirmation: (data) => ({
    subject: 'Booking Confirmation - Coral Cultivation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🪸 Coral Cultivation</h1>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333;">Booking Confirmed! 🎉</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${data.name}, thank you for supporting coral conservation! Your booking has been confirmed.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
            <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
            <p><strong>Package:</strong> ${data.packageName}</p>
            <p><strong>Quantity:</strong> ${data.quantity}</p>
            <p><strong>Total Amount:</strong> ${data.totalAmount.toLocaleString()} VND</p>
            <p><strong>Estimated Completion:</strong> ${new Date(data.estimatedCompletion).toLocaleDateString()}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            You'll receive regular updates about your coral's growth progress. Thank you for making a difference! 🌊
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">© 2024 Coral Cultivation. Protecting our oceans, one coral at a time.</p>
        </div>
      </div>
    `
  }),

  statusUpdate: (data) => ({
    subject: `Booking Update - ${data.message}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🪸 Coral Cultivation</h1>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333;">Update on Your Coral 📈</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${data.name}, we have an update on your coral cultivation project!
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2ecc71;">
            <h3 style="margin-top: 0; color: #333;">${data.message}</h3>
            <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
            <p><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Thank you for your continued support in coral conservation! 🪸
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">© 2024 Coral Cultivation. Protecting our oceans, one coral at a time.</p>
        </div>
      </div>
    `
  }),

  progressUpdate: (data) => ({
    subject: 'Coral Growth Progress Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🪸 Coral Cultivation</h1>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333;">Your Coral is Growing! 🌱</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${data.name}, here's the latest update on your coral cultivation progress:
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db;">
            <h3 style="margin-top: 0; color: #333;">Progress Report</h3>
            <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
            <p><strong>Update:</strong> ${data.description}</p>
          </div>
          
          ${data.images && data.images.length > 0 ? `
            <div style="text-align: center; margin: 20px 0;">
              <h4 style="color: #333;">Latest Photos</h4>
              ${data.images.map(img => `<img src="${img}" style="max-width: 200px; margin: 10px; border-radius: 8px;" alt="Coral progress">`).join('')}
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            Every day your coral grows stronger, contributing to ocean health and marine biodiversity! 🌊
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">© 2024 Coral Cultivation. Protecting our oceans, one coral at a time.</p>
        </div>
      </div>
    `
  }),

  bookingCancellation: (data) => ({
    subject: 'Booking Cancellation - Coral Cultivation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0;">🪸 Coral Cultivation</h1>
        </div>
        
        <div style="padding: 40px; background: #f8f9fa;">
          <h2 style="color: #333;">Booking Cancellation</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${data.name}, your booking has been cancelled as requested.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="margin-top: 0; color: #333;">Cancellation Details</h3>
            <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p><strong>Refund Amount:</strong> ${data.refundAmount.toLocaleString()} VND</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Your refund will be processed within 3-5 business days. We hope to see you back soon! 🌊
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">© 2024 Coral Cultivation. Protecting our oceans, one coral at a time.</p>
        </div>
      </div>
    `
  })
};

// Main email sending function
const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const transporter = createTransporter();
    
    let emailContent;
    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else if (html) {
      emailContent = { subject, html };
    } else {
      throw new Error('No email template or HTML content provided');
    }

    const mailOptions = {
      from: `"Coral Cultivation" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return result;

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Send bulk emails
const sendBulkEmail = async (recipients, { subject, template, data, html }) => {
  try {
    const promises = recipients.map(recipient => 
      sendEmail({
        to: recipient.email,
        subject,
        template,
        data: { ...data, name: recipient.name },
        html
      })
    );

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📧 Bulk email completed: ${successful} sent, ${failed} failed`);
    
    return { successful, failed, results };

  } catch (error) {
    console.error('❌ Bulk email failed:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail
};