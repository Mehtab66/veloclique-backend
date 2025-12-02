import getTransporter from "../config/mailer.js";

const ORG_NAME = process.env.APP_NAME || "VéloCliqué";

/**
 * Send a signup verification OTP to the provided email address.
 * @param {string} email
 * @param {string} otp
 */
export const sendOTPEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required to send the verification code");
  }

  // Get FROM address dynamically (in case env vars load later)
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  
  if (!fromAddress) {
    throw new Error("MAIL_FROM or SMTP_USER environment variable is not configured");
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} verification code`,
    text: `Your ${ORG_NAME} verification code is ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Use the following verification code to finish signing up for ${ORG_NAME}:
        </p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0; text-align: center;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #555;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="font-size: 16px; margin-top: 24px;">
          Ride on,<br/>
          Team ${ORG_NAME}
        </p>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.message);
    throw new Error(`Unable to send verification email: ${error.message}`);
  }
};

/**
 * Send password reset OTP email
 * @param {string} email
 * @param {string} otp
 */
export const sendPasswordResetOTPEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required to send the verification code");
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  
  if (!fromAddress) {
    throw new Error("MAIL_FROM or SMTP_USER environment variable is not configured");
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} password reset code`,
    text: `Your ${ORG_NAME} password reset code is ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Use the following verification code to reset your password for ${ORG_NAME}:
        </p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0; text-align: center;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #555;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="font-size: 16px; margin-top: 24px;">
          Ride on,<br/>
          Team ${ORG_NAME}
        </p>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP email sent to ${email}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send password reset OTP email:", error.message);
    throw new Error(`Unable to send password reset email: ${error.message}`);
  }
};
