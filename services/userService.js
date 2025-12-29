import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/user.model.js";
// import { sendOTPEmail, sendEmailChangeNotification } from "./emailService.js";
import { generateToken } from "../middleware/authMiddleware.js";
import {
  sendEmailChangeOTP,
  sendEmailChangeNotification,
  sendPasswordChangedEmail,
  sendAccountDeletionEmail,
  sendTwoFactorOTP,
  sendAccountDeletionOTP,
} from "./emailService.js";

// Generate OTP for email change
const generateEmailChangeOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get user profile
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Update allowed fields
  if (profileData.name !== undefined) {
    user.name = profileData.name;
  }
  if (profileData.city !== undefined) {
    user.city = profileData.city;
  }
  if (profileData.state !== undefined) {
    user.state = profileData.state;
  }
  if (profileData.profilePicture !== undefined) {
    user.profilePicture = profileData.profilePicture;
  }

  await user.save();
  return user;
};

// Request email change
export const requestEmailChange = async (userId, newEmail) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Check if new email is the same as current
  if (newEmail.toLowerCase() === user.email.toLowerCase()) {
    throw new Error("New email cannot be the same as current email");
  }

  // Check if new email is already in use
  const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
  if (existingUser && existingUser._id.toString() !== userId.toString()) {
    throw new Error("Email already in use");
  }

  // Generate OTP
  const otp = generateEmailChangeOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save OTP and new email to user
  user.newEmail = newEmail.toLowerCase();
  user.emailChangeOTP = otp;
  user.emailChangeOTPExpires = otpExpires;
  await user.save();

  // Send OTP to new email
  await sendEmailChangeOTP(newEmail, otp);

  return {
    message: "OTP sent to new email address",
    newEmail,
  };
};

// Verify and update email
export const verifyAndUpdateEmail = async (userId, otp) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Verify OTP
  if (!user.emailChangeOTP || user.emailChangeOTP !== otp) {
    throw new Error("Invalid OTP");
  }

  // Check if OTP expired
  if (!user.emailChangeOTPExpires || new Date() > user.emailChangeOTPExpires) {
    user.emailChangeOTP = undefined;
    user.emailChangeOTPExpires = undefined;
    user.newEmail = undefined;
    await user.save();
    throw new Error("OTP has expired");
  }

  // Send notification to old email
  await sendEmailChangeNotification(user.email, user.newEmail);

  // Update email
  const oldEmail = user.email;
  user.email = user.newEmail;
  user.newEmail = undefined;
  user.emailChangeOTP = undefined;
  user.emailChangeOTPExpires = undefined;
  await user.save();

  // Generate new token with updated email
  const token = generateToken(user);

  return { user, token, oldEmail };
};

// Update password
export const updateUserPassword = async (
  userId,
  currentPassword,
  newPassword
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Verify current password
  if (!user.password) {
    throw new Error("Please use social login or set a password first");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // Validate new password
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  // Hash and save new password
  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();

  // Clear all sessions except current (security measure)
  user.sessions = [];

  await user.save();

  // Send password changed notification
  await sendPasswordChangedEmail(user.email);

  return user;
};

// Toggle two-factor authentication (Disable only or direct toggle)
export const toggleTwoFactorAuth = async (userId, enable) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (enable) {
    // Legacy direct enable or if using Authenticator App (not implemented here)
    // For OTP flow, use requestTwoFactorOTP/verifyTwoFactorOTP
    // But if we just want to force enable:
    user.twoFactorEnabled = true;
  } else {
    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpires = undefined;
  }

  await user.save();

  return user;
};

// Request 2FA OTP
export const requestTwoFactorOTP = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.twoFactorEnabled) {
    throw new Error("Two-factor authentication is already enabled");
  }

  // Generate OTP
  const otp = generateEmailChangeOTP(); // Reuse generic OTP generator
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.twoFactorOTP = otp;
  user.twoFactorOTPExpires = otpExpires;
  await user.save();

  await sendTwoFactorOTP(user.email, otp);

  return { otp }; // Controller will send email
};

// Verify 2FA OTP and Enable
export const verifyTwoFactorOTP = async (userId, otp) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.twoFactorOTP || user.twoFactorOTP !== otp) {
    throw new Error("Invalid OTP");
  }

  if (!user.twoFactorOTPExpires || new Date() > user.twoFactorOTPExpires) {
    throw new Error("OTP has expired");
  }

  // OTP verified, enable 2FA
  user.twoFactorEnabled = true;
  user.twoFactorOTP = undefined;
  user.twoFactorOTPExpires = undefined;
  await user.save();

  return user;
};

// Update email preferences
export const updateUserEmailPreferences = async (userId, preferences) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Update preferences if provided
  if (preferences.newShops !== undefined) {
    user.emailPreferences.newShops = preferences.newShops;
  }
  if (preferences.routeHighlights !== undefined) {
    user.emailPreferences.routeHighlights = preferences.routeHighlights;
  }
  if (preferences.monthlyUpdates !== undefined) {
    user.emailPreferences.monthlyUpdates = preferences.monthlyUpdates;
  }
  if (preferences.specialOffers !== undefined) {
    user.emailPreferences.specialOffers = preferences.specialOffers;
  }

  await user.save();
  return user;
};

// Update privacy settings
export const updateUserPrivacySettings = async (userId, isProfilePrivate) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.isProfilePrivate = isProfilePrivate;
  await user.save();

  return user;
};

// Generate data export
export const generateDataExport = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Collect user data
  const userData = {
    profile: {
      name: user.name,
      email: user.email,
      city: user.city,
      state: user.state,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    preferences: {
      emailPreferences: user.emailPreferences,
      isProfilePrivate: user.isProfilePrivate,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };

  // Generate download link (in production, upload to S3 or similar)
  const token = crypto.randomBytes(32).toString("hex");
  const downloadLink = `/api/users/data/download/${token}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save download info
  user.dataExport = {
    downloadLink,
    expiresAt,
    requestedAt: new Date(),
  };
  await user.save();

  // TODO: In production, implement actual file generation and storage
  // await sendDataExportEmail(user.email, downloadLink, expiresAt);

  return { downloadLink, expiresAt };
};

// Request account deletion (Generate OTP)
export const requestAccountDeletion = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save OTP
  user.accountDeleteOTP = otp;
  user.accountDeleteOTPExpires = expiresAt;

  await user.save();

  // Send OTP email
  await sendAccountDeletionOTP(user.email, otp);

  return { email: user.email };
};

// Verify OTP and delete account
export const verifyAccountDeletion = async (userId, otp) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (
    !user.accountDeleteOTP ||
    user.accountDeleteOTP !== otp ||
    !user.accountDeleteOTPExpires ||
    user.accountDeleteOTPExpires < Date.now()
  ) {
    throw new Error("Invalid or expired OTP");
  }

  // Clear OTP fields
  user.accountDeleteOTP = undefined;
  user.accountDeleteOTPExpires = undefined;

  const originalEmail = user.email;

  // Proceed with deletion logic (similar to deleteUserAccount)
  // For GDPR compliance, we should anonymize instead of delete
  // For now, we'll mark for deletion and schedule actual deletion
  user.email = `deleted_${Date.now()}_${user.email}`;
  user.name = "Deleted User";
  user.city = undefined;
  user.state = undefined;
  user.googleId = undefined;
  user.facebookId = undefined;
  user.appleId = undefined;
  user.twoFactorSecret = undefined;
  user.twoFactorEnabled = false;
  user.sessions = [];
  user.isProfilePrivate = true;
  user.markedForDeletion = true;
  user.deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  await user.save();

  // Send account deletion confirmation to ORIGINAL email
  await sendAccountDeletionEmail(originalEmail);

  return true;
};

// Delete user account (Legacy/Password based)
export const deleteUserAccount = async (userId, password) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Verify password for local accounts
  if (user.password) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Incorrect password");
    }
  }

  // Capture original email before modifying it
  const originalEmail = user.email;

  // For GDPR compliance, we should anonymize instead of delete
  // For now, we'll mark for deletion and schedule actual deletion
  user.email = `deleted_${Date.now()}_${user.email}`;
  user.name = "Deleted User";
  user.city = undefined;
  user.state = undefined;
  user.googleId = undefined;
  user.facebookId = undefined;
  user.appleId = undefined;
  user.twoFactorSecret = undefined;
  user.twoFactorEnabled = false;
  user.sessions = [];
  user.isProfilePrivate = true;
  user.markedForDeletion = true;
  user.deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  await user.save();

  // Send account deletion confirmation
  await sendAccountDeletionEmail(originalEmail);

  return true;
};

// Get user sessions
export const getUserSessions = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Filter out expired sessions
  const activeSessions = user.sessions.filter((session) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new Date(session.lastActive) > thirtyDaysAgo;
  });

  // Update user's sessions to remove expired ones
  user.sessions = activeSessions;
  await user.save();

  return activeSessions.map((session) => ({
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    lastActive: session.lastActive,
    createdAt: session.createdAt,
    isCurrent: false, // Will be set by controller
  }));
};

// End all sessions except current
export const endAllUserSessions = async (userId, currentToken) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Keep only the current session
  const currentSession = user.sessions.find(
    (session) => session.token === currentToken
  );
  user.sessions = currentSession ? [currentSession] : [];

  await user.save();
  return true;
};

// Add session when user logs in
export const addUserSession = async (
  userId,
  token,
  deviceInfo = "Unknown Device",
  ipAddress = "Unknown"
) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Initialize sessions array if it doesn't exist
    if (!user.sessions) {
      user.sessions = [];
    }

    // Remove expired sessions (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    user.sessions = user.sessions.filter(
      (session) => new Date(session.lastActive) > thirtyDaysAgo
    );

    // Check if session already exists
    const existingSessionIndex = user.sessions.findIndex(
      (session) => session.token === token
    );

    if (existingSessionIndex !== -1) {
      // Update existing session
      user.sessions[existingSessionIndex].lastActive = new Date();
      user.sessions[existingSessionIndex].deviceInfo = deviceInfo;
      user.sessions[existingSessionIndex].ipAddress = ipAddress;
    } else {
      // Add new session
      user.sessions.push({
        token,
        deviceInfo: deviceInfo || "Unknown Device",
        ipAddress: ipAddress || "Unknown",
        lastActive: new Date(),
        createdAt: new Date(),
      });

      // Keep only last 10 sessions
      if (user.sessions.length > 10) {
        user.sessions = user.sessions.slice(-10);
      }
    }

    await user.save();
    return true;
  } catch (error) {
    console.error("Error adding user session:", error);
    throw error;
  }
};
