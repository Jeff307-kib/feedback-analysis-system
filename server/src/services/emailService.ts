import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (to: string, code: string, name: string) => {
  // If no SMTP credentials are provided, mock the email behavior (useful for local dev without env variables)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: Your Verification Code`);
    console.log(`Body: Hi ${name}, your code is ${code}`);
    console.log('------------------\n');
    return true; // Simulate success
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b;">Password Reset Verification</h2>
      <p style="color: #334155; font-size: 16px;">Hi ${name},</p>
      <p style="color: #334155; font-size: 16px;">We received a request to reset your password. Use the verification code below to complete the process:</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 4px;">${code}</span>
      </div>
      
      <p style="color: #334155; font-size: 14px;">This code expires in 15 minutes.</p>
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">If you did not request this, please ignore this email or contact support if you have concerns.</p>
    </div>
  `;

  const textContent = `
    Password Reset Verification
    
    Hi ${name},
    
    We received a request to reset your password. Your verification code is:
    
    ${code}
    
    This code expires in 15 minutes.
    If you did not request this, please ignore this email.
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Feedback Analysis System" <no-reply@feedbacksystem.com>',
      to,
      subject: 'Your Password Reset Verification Code',
      text: textContent,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendFeedbackReplyEmail = async (to: string, originalSubject: string, replyMessage: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: Re: ${originalSubject}`);
    console.log(`Body: ${replyMessage}`);
    console.log('------------------\n');
    return true;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b;">Reply to your feedback</h2>
      <p style="color: #334155; font-size: 16px;">We have a response regarding your recent feedback:</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="color: #1e293b; font-size: 15px; margin: 0; white-space: pre-wrap;">${replyMessage}</p>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">Thank you for reaching out to us!</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Feedback Analysis System Support" <support@feedbacksystem.com>',
      to,
      subject: `Re: ${originalSubject}`,
      text: replyMessage,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending feedback reply email:', error);
    throw new Error('Failed to send reply email');
  }
};
