import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, url) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: '"Pick My College" <noreply@pickmycollege.vercel.app>',
    to: email,
    subject: 'Verify Your Email Address',
    html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f9f9f9; border-radius: 10px; border: 1px solid #ddd;">
    <h2 style="color: #1a3b89;">Welcome to Pick My College 🎓</h2>
    <p>Hi there,</p>
    <p>Thanks for signing up! Please verify your email to continue.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        ✅ Verify Email
      </a>
    </div>

    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 6px solid #ffc107; border-radius: 6px;">
      <p style="font-size: 16px; margin: 0; color: #856404;">
        <strong>📌 Important:</strong> After clicking the verify button, <strong>please return to the app to continue</strong>. This link is valid for only <strong>2 minutes</strong>.
      </p>
    </div>

    <p style="color: #999; font-size: 13px; margin-top: 30px;">
      If you didn’t request this, you can safely ignore this email.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      — The Pick My College Team
    </p>
  </div>
`


  };

  await transporter.sendMail(mailOptions);
};

export const sendResetEmail = async (email, url) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: '"Pick My College" <noreply@pickmycollege.vercel.app>',
    to: email,
    subject: 'Confirm Your Password Reset Request',
    html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f9f9f9; border-radius: 10px; border: 1px solid #ddd;">
    <h2 style="color: #1a3b89;">Reset Your Password 🔐</h2>
    <p>Hello,</p>
    <p>We received a request to reset your password. If you made this request, please click the button below to confirm and continue.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="background-color: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        🔄 Confirm Password Reset
      </a>
    </div>

    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 6px solid #ffc107; border-radius: 6px;">
      <p style="font-size: 16px; margin: 0; color: #856404;">
        <strong>⚠️ Note:</strong> This link is valid for <strong>10 minutes only</strong>. If you didn’t request a password reset, you can safely ignore this email.
      </p>
    </div>

    <p style="font-size: 14px; margin-top: 20px;">
      — The Pick My College Team
    </p>
  </div>
  `
  };

  await transporter.sendMail(mailOptions);
};
