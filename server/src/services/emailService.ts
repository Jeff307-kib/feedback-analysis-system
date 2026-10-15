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

export const sendSuspensionEmail = async (to: string, name: string, reason: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: Important: Your Account Has Been Suspended`);
    console.log(`Recipient: ${name}`);
    console.log(`Reason: ${reason}`);
    console.log('------------------\n');
    return true;
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #dc2626; margin: 0; font-size: 22px; font-weight: 700;">Account Suspension Notice</h2>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear ${name},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">We are writing to notify you that your Feedback Analysis System account has been suspended by an administrator.</p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #991b1b; font-weight: 700; margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Reason for Suspension:</p>
        <p style="color: #1e293b; font-size: 15px; margin: 0; line-height: 1.5; white-space: pre-wrap;">${reason}</p>
      </div>
      
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">While suspended, you are unable to access your dashboard, datasets, and analysis reports.</p>
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">If you believe this was done in error or if you wish to appeal this decision, please contact our support team at <a href="mailto:support@feedbacksystem.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">support@feedbacksystem.com</a>.</p>
      </div>
    </div>
  `;

  const textContent = `
Account Suspension Notice

Dear ${name},

We are writing to notify you that your Feedback Analysis System account has been suspended by an administrator.

Reason for Suspension:
${reason}

While suspended, you are unable to access your dashboard, datasets, and analysis reports.

If you believe this was done in error or wish to appeal this decision, please contact our support team at support@feedbacksystem.com.
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Feedback Analysis System Support" <support@feedbacksystem.com>',
      to,
      subject: 'Important: Your Account Has Been Suspended',
      text: textContent,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending suspension email via Nodemailer:', error);
    // Return false rather than throwing so suspension transaction remains completed
    return false;
  }
};

export const sendReactivationEmail = async (to: string, name: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: Your Account Has Been Reactivated - Feedback Analysis System`);
    console.log(`Recipient: ${name}`);
    console.log(`Body: Hi ${name}, your account has been reactivated. You can now log in.`);
    console.log('------------------\n');
    return true;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const loginUrl = `${appUrl}/login`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #16a34a; margin: 0; font-size: 22px; font-weight: 700;">Account Reactivated</h2>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear ${name},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Good news! Your Feedback Analysis System account has been reviewed and reactivated by an administrator.</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #166534; font-weight: 600; margin: 0 0 6px 0; font-size: 14px;">Full Access Restored</p>
        <p style="color: #1e293b; font-size: 14px; margin: 0; line-height: 1.5;">You can now log in to access your dashboard, uploaded datasets, reports, and subscription services without any restrictions.</p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">Log In to Your Account</a>
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">If you have any questions or require assistance, feel free to reply to this email or reach us at <a href="mailto:support@feedbacksystem.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">support@feedbacksystem.com</a>.</p>
      </div>
    </div>
  `;

  const textContent = `
Account Reactivated

Dear ${name},

Good news! Your Feedback Analysis System account has been reviewed and reactivated by an administrator.

Full Access Restored:
You can now log in to access your dashboard, uploaded datasets, reports, and subscription services without restrictions.

Log in here: ${loginUrl}

If you have questions or require assistance, please reach us at support@feedbacksystem.com.
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Feedback Analysis System Support" <support@feedbacksystem.com>',
      to,
      subject: 'Your Account Has Been Reactivated - Feedback Analysis System',
      text: textContent,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending reactivation email via Nodemailer:', error);
    return false;
  }
};

export const sendPlanAnnouncementEmail = async (to: string, name: string, title: string, message: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n--- EMAIL MOCK ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${title} - Feedback Analysis System`);
    console.log(`Recipient: ${name}`);
    console.log(`Body: ${message}`);
    console.log('------------------\n');
    return true;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const plansUrl = `${appUrl}/dashboard/subscriptions`;

  const formattedHtmlMessage = message
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 8px 0;">${line}</p>`)
    .join('');

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 22px; font-weight: 700;">${title}</h2>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
      
      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
        ${formattedHtmlMessage}
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${plansUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">View Subscription Plans</a>
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">If you have any questions or require assistance, feel free to reply to this email or reach us at <a href="mailto:support@feedbacksystem.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">support@feedbacksystem.com</a>.</p>
      </div>
    </div>
  `;

  const textContent = `
${title}

Hello ${name},

${message}

View plans here: ${plansUrl}

If you have questions or require assistance, please reach us at support@feedbacksystem.com.
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Feedback Analysis System Support" <support@feedbacksystem.com>',
      to,
      subject: `${title} - Feedback Analysis System`,
      text: textContent,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending announcement email via Nodemailer:', error);
    return false;
  }
};


