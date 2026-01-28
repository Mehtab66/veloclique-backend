import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import resend from '../config/resend.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to email templates directory
const TEMPLATES_DIR = path.join(__dirname, '../../src/email-templates');

const ORG_NAME = process.env.APP_NAME || "VéloCliqué";
const DEFAULT_FROM = process.env.EMAIL_FROM_DEFAULT || 'VéloCliqué <hello@veloclique.com>';
const NOREPLY_FROM = process.env.EMAIL_FROM_NOREPLY || 'VéloCliqué <noreply@veloclique.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'hello@veloclique.com';

/**
 * Load and compile an HTML template
 * @param {string} templateName - The filename of the template
 * @param {Object} variables - Key-value pairs to replace in the template
 * @returns {string} - The compiled HTML
 */
const loadTemplate = (templateName, variables = {}) => {
  try {
    const filePath = path.join(TEMPLATES_DIR, templateName);
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace variables {{key}} with values
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, variables[key] || '');
    });

    return html;
  } catch (error) {
    console.warn(`Warning: Template ${templateName} not found at ${path.join(TEMPLATES_DIR, templateName)}. Falling back to simple delivery.`);
    return null;
  }
};

/**
 * Common sendEmail function using Resend
 */
const sendEmail = async ({ to, subject, html, text, from = DEFAULT_FROM, replyTo = REPLY_TO, attachments = [] }) => {
  try {
    const payload = {
      from,
      to,
      subject,
      html,
      reply_to: replyTo,
      attachments
    };

    if (text) payload.text = text;

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('❌ Resend logic error:', error);
      throw error;
    }

    console.log(`✅ Email sent successfully to ${to}. ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error('❌ Failed to send email via Resend:', error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * 01 - Welcome Email
 */
export const sendWelcomeEmail = async (email, firstName) => {
  const html = loadTemplate('01-welcome-email.html', { firstName });
  return sendEmail({
    to: email,
    subject: `Welcome to ${ORG_NAME}, ${firstName}!`,
    html: html || `<h1>Welcome to ${ORG_NAME}, ${firstName}!</h1>`,
    from: DEFAULT_FROM
  });
};

/**
 * 02 - Email Verification / OTP
 */
export const sendOTPEmail = async (email, otp, firstName = "Rider") => {
  const html = loadTemplate('02-email-verification.html', {
    firstName,
    verificationUrl: otp // User will see the OTP code where the URL would be
  });

  return sendEmail({
    to: email,
    subject: `Verify your email address`,
    html: html || `<p>Your verification code is: <strong>${otp}</strong></p>`,
    from: NOREPLY_FROM
  });
};

/**
 * 03 - Password Reset (OTP version)
 */
export const sendPasswordResetOTPEmail = async (email, otp, firstName = "Rider") => {
  const html = loadTemplate('03-password-reset.html', {
    firstName,
    resetUrl: otp
  });

  return sendEmail({
    to: email,
    subject: `Reset your ${ORG_NAME} password`,
    html: html || `<p>Your password reset code is: <strong>${otp}</strong></p>`,
    from: NOREPLY_FROM
  });
};

/**
 * 04 - Contribution Confirmation
 */
export const sendContributionConfirmation = async (email, firstName, tierName, amount, contributionType) => {
  const html = loadTemplate('04-contribution-confirmation.html', {
    firstName,
    tierName,
    amount,
    contributionType,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  });

  return sendEmail({
    to: email,
    subject: `Thank you for supporting ${ORG_NAME}!`,
    html: html || `<h1>Thank you for your contribution!</h1>`,
    from: DEFAULT_FROM
  });
};

/**
 * 05 - Contact Form Confirmation (To User)
 */
export const sendContactFormConfirmation = async (email, firstName, subject, message) => {
  const html = loadTemplate('05-contact-form-confirmation.html', {
    firstName,
    subject,
    message,
    date: new Date().toLocaleString()
  });

  return sendEmail({
    to: email,
    subject: `We received your message`,
    html: html || `<h1>We received your message</h1>`,
    from: DEFAULT_FROM
  });
};

/**
 * 06 - Account Deletion Confirmation (After Deletion)
 */
export const sendAccountDeletionEmail = async (email, firstName = "Rider") => {
  const html = loadTemplate('06-account-deletion-confirmation.html', {
    firstName,
    deletionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  });

  return sendEmail({
    to: email,
    subject: `Your ${ORG_NAME} account has been deleted`,
    html: html || `<h1>Account Deleted</h1>`,
    from: NOREPLY_FROM
  });
};

// Alias for compatibility
export const sendAccountDeletionConfirmation = sendAccountDeletionEmail;

/**
 * 07 - Shop Claim Notification
 */
export const sendShopClaimNotification = async (email, firstName, shopName, shopAddress, requestId) => {
  const html = loadTemplate('07-shop-claim-notification.html', {
    firstName,
    shopName,
    shopAddress,
    requestId
  });

  return sendEmail({
    to: email,
    subject: `Shop claim request received`,
    html: html || `<h1>Shop claim request received</h1>`,
    from: DEFAULT_FROM
  });
};

/**
 * 08 - Internal Contact Notification (To Admin)
 */
export const sendInternalContactNotification = async (senderName, senderEmail, subject, message, attachments = []) => {
  const html = loadTemplate('08-internal-contact-notification.html', {
    senderName,
    senderEmail,
    subject,
    message,
    timestamp: new Date().toLocaleString()
  });

  return sendEmail({
    to: REPLY_TO,
    subject: `New contact form submission: ${subject}`,
    html: html || `<h1>New submission from ${senderName}</h1>`,
    from: NOREPLY_FROM,
    attachments
  });
};

/**
 * OTP for email change
 */
export const sendEmailChangeOTP = async (email, otp) => {
  return sendOTPEmail(email, otp);
};

/**
 * 2FA OTP
 */
export const sendTwoFactorOTP = async (email, otp) => {
  return sendOTPEmail(email, otp);
};

/**
 * Account Deletion OTP (Code to confirm deletion)
 */
export const sendAccountDeletionOTP = async (email, otp) => {
  return sendOTPEmail(email, otp);
};

/**
 * Email change notification (to old email)
 */
export const sendEmailChangeNotification = async (oldEmail, newEmail) => {
  return sendEmail({
    to: oldEmail,
    subject: `${ORG_NAME} Email Address Changed`,
    html: `<div style="font-family: Arial, sans-serif;">
      <h2>Email Address Changed</h2>
      <p>Your email address for ${ORG_NAME} has been changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    </div>`,
    from: NOREPLY_FROM
  });
};

/**
 * Password changed notification
 */
export const sendPasswordChangedEmail = async (email) => {
  return sendEmail({
    to: email,
    subject: `${ORG_NAME} Password Changed Successfully`,
    html: `<div style="font-family: Arial, sans-serif;">
      <h2>Password Changed</h2>
      <p>Your password for ${ORG_NAME} has been updated successfully.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    </div>`,
    from: NOREPLY_FROM
  });
};

/**
 * Legacy support for old calls
 */
export const sendContactFormEmail = async (formData, attachment = null) => {
  let attachments = [];
  if (attachment) {
    attachments.push({
      filename: attachment.originalname || 'attachment',
      content: attachment.buffer || attachment.content
    });
  }
  return sendInternalContactNotification(formData.fullName, formData.email, formData.topic, formData.message, attachments);
};

export default {
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetOTPEmail,
  sendContributionConfirmation,
  sendContactFormConfirmation,
  sendAccountDeletionEmail,
  sendAccountDeletionConfirmation,
  sendShopClaimNotification,
  sendInternalContactNotification,
  sendContactFormEmail,
  sendEmailChangeOTP,
  sendEmailChangeNotification,
  sendPasswordChangedEmail,
  sendTwoFactorOTP,
  sendAccountDeletionOTP
};
