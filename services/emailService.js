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

// Email change notification
export const sendEmailChangeNotification = async (oldEmail, newEmail) => {
  if (!oldEmail || !newEmail) {
    throw new Error("Both old and new email addresses are required");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const mailOptions = {
    to: oldEmail,
    from: fromAddress,
    subject: `${ORG_NAME} Email Address Changed`,
    text: `Your ${ORG_NAME} email address has been changed from ${oldEmail} to ${newEmail}. If you didn't make this change, please contact support immediately.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Your email address for ${ORG_NAME} has been successfully updated.
        </p>
        <div style="background-color: #f9f9f9; border-left: 4px solid #FF6A13; padding: 16px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Previous Email:</strong> ${oldEmail}</p>
          <p style="margin: 8px 0 0 0;"><strong>New Email:</strong> ${newEmail}</p>
        </div>
        <p style="font-size: 14px; color: #555;">
          If you did not make this change, please contact our support team immediately to secure your account.
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
    console.log(
      `✅ Email change notification sent to ${oldEmail}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error(
      "❌ Failed to send email change notification:",
      error.message
    );
    throw new Error(
      `Unable to send email change notification: ${error.message}`
    );
  }
};

// Data export notification
export const sendDataExportEmail = async (email, downloadLink, expiresAt) => {
  if (!email || !downloadLink || !expiresAt) {
    throw new Error("Email, download link, and expiration date are required");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const formattedDate = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Your Data Export is Ready`,
    text: `Your ${ORG_NAME} data export is ready for download. Download link: ${downloadLink}. This link expires on ${formattedDate}.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Your ${ORG_NAME} data export has been prepared and is ready for download.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${downloadLink}" style="background-color: #FF6A13; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            Download My Data
          </a>
        </div>
        <p style="font-size: 14px; color: #555; text-align: center;">
          This download link will expire on <strong>${formattedDate}</strong>
        </p>
        <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Security Notice:</strong></p>
          <p style="margin: 0; font-size: 14px; color: #555;">
            • This link is unique to you and should not be shared<br/>
            • The download will be available for 24 hours<br/>
            • If you did not request this export, please contact support immediately
          </p>
        </div>
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
    console.log(
      `✅ Data export email sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send data export email:", error.message);
    throw new Error(`Unable to send data export email: ${error.message}`);
  }
};

// Account deletion confirmation
export const sendAccountDeletionEmail = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const formattedDate = deletionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Account Deletion Confirmation`,
    text: `Your ${ORG_NAME} account deletion has been scheduled and will be permanently deleted on ${formattedDate}. If you didn't request this, please contact support immediately.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          We've received your request to delete your ${ORG_NAME} account.
        </p>
        <div style="background-color: #fff3f3; border: 1px solid #ffcdd2; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 12px 0; font-size: 18px; color: #d32f2f; font-weight: bold;">
            ⚠️ Account Deletion Scheduled
          </p>
          <p style="margin: 0; font-size: 16px;">
            Your account has been scheduled for permanent deletion on:<br/>
            <strong style="font-size: 18px;">${formattedDate}</strong>
          </p>
        </div>
        <p style="font-size: 16px; margin-bottom: 16px;">
          During this 30-day period, your account will be in a deactivated state. If you change your mind, you can:
        </p>
        <ul style="font-size: 16px; color: #555; margin-bottom: 20px;">
          <li>Contact our support team to cancel the deletion</li>
          <li>Log in to your account (you'll have access until the deletion date)</li>
        </ul>
        <div style="background-color: #f9f9f9; border-left: 4px solid #555; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #555;">
            <strong>Important:</strong> After ${formattedDate}, all your data will be permanently removed and cannot be recovered.
          </p>
        </div>
        <p style="font-size: 14px; color: #777; margin-top: 24px;">
          If you did not request this account deletion, please contact our support team immediately to secure your account.
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
    console.log(
      `✅ Account deletion email sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send account deletion email:", error.message);
    throw new Error(`Unable to send account deletion email: ${error.message}`);
  }
};

export const sendEmailChangeOTP = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required to send the verification code");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Email Change Verification`,
    text: `Your ${ORG_NAME} email change verification code is ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          You've requested to change your email address for ${ORG_NAME}. Use the following verification code to confirm this change:
        </p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0; text-align: center;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #555;">
          This code expires in 10 minutes. If you didn't request this email change, please secure your account immediately.
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
    console.log(
      `✅ Email change OTP sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send email change OTP:", error.message);
    throw new Error(
      `Unable to send email change verification: ${error.message}`
    );
  }
};

export const sendPasswordChangedEmail = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Password Changed Successfully`,
    text: `Your ${ORG_NAME} password has been changed successfully. If you didn't make this change, please contact support immediately.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Your ${ORG_NAME} password was recently changed.
        </p>
        <div style="background-color: #f0f9ff; border: 1px solid #b3e0ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 16px;">
            ✅ <strong>Password Change Confirmed</strong><br/>
            <span style="color: #555; font-size: 14px;">The password for your account has been updated successfully.</span>
          </p>
        </div>
        <p style="font-size: 14px; color: #555;">
          For security, all other active sessions have been logged out. You'll need to log in again on other devices.
        </p>
        <div style="background-color: #f9f9f9; border-left: 4px solid #ff6a13; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #555;">
            <strong>Security Notice:</strong> If you did not make this password change, please contact our support team immediately to secure your account.
          </p>
        </div>
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
    console.log(
      `✅ Password changed email sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send password changed email:", error.message);
    throw new Error(`Unable to send password changed email: ${error.message}`);
  }
};

export const sendTwoFactorOTP = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required to send the 2FA code");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Two-Factor Authentication Code`,
    text: `Your ${ORG_NAME} 2FA verification code is ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Use the following code to enable Two-Factor Authentication for your ${ORG_NAME} account:
        </p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0; text-align: center;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #555;">
          This code expires in 10 minutes. 
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
    console.log(
      `✅ 2FA OTP sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send 2FA OTP:", error.message);
    throw new Error(
      `Unable to send 2FA verification: ${error.message}`
    );
  }
};

export const sendShopDeletionOTP = async (email, otp, shopName) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required to send the deletion code");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Shop Deletion Verification Code`,
    text: `Your verification code to delete shop "${shopName || 'your shop'}" is ${otp}. This code will expire in 10 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          You've requested to delete your shop <strong>"${shopName || 'your shop'}"</strong> from ${ORG_NAME}.
        </p>
        <div style="background-color: #fff3f3; border: 1px solid #ffcdd2; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #d32f2f;">
            ⚠️ <strong>Warning:</strong> This action is permanent and cannot be undone.
          </p>
        </div>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Enter the following verification code to confirm deletion:
        </p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0; text-align: center;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #555;">
          This code expires in 10 minutes. If you did not request this, please ignore this email and your shop will remain safe.
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
    console.log(
      `✅ Shop deletion OTP sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send shop deletion OTP:", error.message);
    throw new Error(
      `Unable to send shop deletion verification: ${error.message}`
    );
  }
};

/**
 * Send account deletion OTP
 * @param {string} email
 * @param {string} otp
 */
export const sendAccountDeletionOTP = async (email, otp) => {
  if (!email || !otp) {
    throw new Error("Email and OTP are required to send the deletion code");
  }

  const ORG_NAME = process.env.ORG_NAME || "VéloCliqué";
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    throw new Error(
      "MAIL_FROM or SMTP_USER environment variable is not configured"
    );
  }

  const mailOptions = {
    to: email,
    from: fromAddress,
    subject: `${ORG_NAME} Account Deletion Verification Code`,
    text: `Your verification code to delete your ${ORG_NAME} account is ${otp}. This code will expire in 10 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p style="font-size: 16px; margin-bottom: 16px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 16px;">
          You've requested to delete your ${ORG_NAME} account.
        </p>
        <div style="background-color: #fff3f3; border: 1px solid #ffcdd2; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #d32f2f;">
            ⚠️ <strong>Warning:</strong> This action is permanent and cannot be undone.
          </p>
        </div>
        <p style="font-size: 16px; margin-bottom: 16px;">
          Enter the following verification code to confirm deletion:
        </p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0; text-align: center;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #555;">
          This code expires in 10 minutes. If you did not request this, please ignore this email and your account will remain safe.
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
    console.log(
      `✅ Account deletion OTP sent to ${email}. Message ID: ${info.messageId}`
    );
    return info;
  } catch (error) {
    console.error("❌ Failed to send account deletion OTP:", error.message);
    throw new Error(
      `Unable to send account deletion verification: ${error.message}`
    );
  }
};