import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EMAIL_SERVICE] Missing credentials. Email not sent.');
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  if (!to) {
    console.warn('[EMAIL_SERVICE] No recipient address provided.');
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log('[EMAIL_SERVICE] Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('[EMAIL_SERVICE] Error sending email:', error);
    return null;
  }
}

// Email Templates
export const templates = {
  registration: (name) => ({
    subject: 'Welcome to Aone Target Institute!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #1A237E; text-align: center;">Welcome, ${name}!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for registering with Aone Target Institute. Your account has been successfully created.</p>
        <p>You can now login using your registered mobile number and OTP.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aonetarget.in" style="background-color: #1A237E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Dashboard</a>
        </div>
        <p>If you have any questions, feel free to reply to this email.</p>
        <br>
        <p>Best Regards,<br>Team Aone Target</p>
      </div>
    `
  }),
  login: (name, time) => ({
    subject: 'Login Notification - Aone Target',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #1A237E;">Successful Login</h2>
        <p>Hello ${name},</p>
        <p>You have successfully logged into your account at ${time}.</p>
        <p>If this wasn't you, please contact us immediately.</p>
        <br>
        <p>Best Regards,<br>Team Aone Target</p>
      </div>
    `
  }),
  purchase: (name, courseName, amount) => ({
    subject: 'Course Enrollment Successful!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2E7D32; text-align: center;">Congrats on your Purchase!</h2>
        <p>Hi ${name},</p>
        <p>You have successfully enrolled in <strong>${courseName}</strong>.</p>
        <p><strong>Amount Paid:</strong> ₹${amount}</p>
        <p>You can start studying right away from your dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aonetarget.in/dashboard" style="background-color: #1A237E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Course</a>
        </div>
        <p>Receipt ID: RCPT-${Date.now()}</p>
        <br>
        <p>Best Regards,<br>Team Aone Target</p>
      </div>
    `
  }),
  paymentFailed: (name, courseName, amount, reason) => ({
    subject: 'Payment Failed - Aone Target Institute',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="color: #D32F2F; text-align: center;">Payment Unsuccessful</h2>
        <p>Hi ${name},</p>
        <p>We're sorry, but your payment for <strong>${courseName}</strong> has failed.</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>Reason:</strong> ${reason || 'Technical issue during verification'}</p>
        <p>If the amount was deducted from your account, it will be refunded automatically within 5-7 business days. You can try purchasing the course again from the store.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aonetarget.in/store" style="background-color: #D32F2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Try Again</a>
        </div>
        <p>If you need help, please contact our support team.</p>
        <br>
        <p>Best Regards,<br>Team Aone Target</p>
      </div>
    `
  }),
  securityAlert: (name, time, type = 'Login Attempt') => ({
    subject: 'Security Alert: Multiple Failed Login Attempts',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; border-top: 5px solid #D32F2F;">
        <h2 style="color: #D32F2F;">Security Alert!</h2>
        <p>Hello ${name},</p>
        <p>Our system detected multiple failed <strong>${type}</strong> attempts on your account at ${time}.</p>
        <p>If this was not you, please secure your account immediately or contact our support team.</p>
        <div style="background-color: #FFF3E0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Device/Action:</strong> Multiple failed attempts detected.
        </div>
        <p>For security reasons, please do not share your OTP or password with anyone.</p>
        <br>
        <p>Best Regards,<br>Security Team, Aone Target</p>
      </div>
    `
  }),
  unauthorizedLogin: (name, time) => ({
    subject: 'Security Alert: Account Access from New Device',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; border-top: 5px solid #FF9800;">
        <h2 style="color: #E65100;">Security Alert!</h2>
        <p>Hello ${name},</p>
        <p>Your Aone Target account was just logged into from a new device/browser at ${time}.</p>
        <p>If this was you, you can safely ignore this email. Your previous session on other devices has been automatically logged out to ensure security.</p>
        <div style="background-color: #FFF3E0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Action:</strong> New Session Started (Previous sessions revoked)
        </div>
        <p>If you did <strong>NOT</strong> perform this login, someone else may have access to your account. Please contact our support team immediately.</p>
        <br>
        <p>Best Regards,<br>Security Team, Aone Target</p>
      </div>
    `
  }),
  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset Request - Aone Target Institute',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; border-top: 5px solid #1A237E;">
        <h2 style="color: #1A237E; text-align: center;">Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your Aone Target account. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1A237E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p style="font-size: 12px; color: #777;">If the button doesn't work, copy and paste this link into your browser:<br>${resetUrl}</p>
        <br>
        <p>Best Regards,<br>Team Aone Target</p>
      </div>
    `
  })
};
