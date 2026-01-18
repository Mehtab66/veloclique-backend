import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import { sendOTPEmail } from "./emailService.js";
import { generateToken } from "../middleware/authMiddleware.js";
import { addUserSession } from "./userService.js";

// Generate 6-digit OTP (reused for password reset)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendSignupOTP = async (email, password, name = null) => {
  // Check if user already exists
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  // Generate OTP
  const otp = generateOTP();

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Delete any existing OTP for this email
  await OTP.deleteMany({ email });

  // Create new OTP record
  const otpRecord = await OTP.create({
    email,
    otp,
    password: hashedPassword,
    name,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  // Send OTP email
  try {
    await sendOTPEmail(email, otp);
  } catch (error) {
    // If email sending fails, delete the OTP record
    await OTP.deleteOne({ _id: otpRecord._id });
    // Re-throw the original error message (don't wrap it)
    throw error;
  }

  return { message: "OTP sent successfully", email };
};

export const verifySignupOTP = async (email, otp) => {
  // Find OTP record
  const otpRecord = await OTP.findOne({ email, otp });
  if (!otpRecord) throw new Error("Invalid or expired OTP");

  // Check if OTP is expired
  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new Error("OTP has expired");
  }

  // Check if user already exists (race condition check)
  const existing = await User.findOne({ email });
  if (existing) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new Error("User already exists");
  }

  // Create user account with default preferences
  const user = await User.create({
    email: otpRecord.email,
    password: otpRecord.password,
    name: otpRecord.name || null,
    displayName: otpRecord.name || null,
    emailPreferences: {
      newShops: true,
      routeHighlights: true,
      monthlyUpdates: true,
      specialOffers: false,
    },
    isProfilePrivate: true,
    twoFactorEnabled: false,
  });

  // Delete OTP record after successful registration
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate token for new user
  const token = generateToken(user);

  // Return user without password
  const userObj = user.toObject();
  delete userObj.password;

  return { user: userObj, token };
};

export const registerUser = async (name, email, password) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  return user;
};

export const validateUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  if (!user.password) {
    throw new Error("Please use social login or reset your password");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid password");

  return user;
};

/**
 * Login user and generate JWT token
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} User object and JWT token
 */
export const loginUser = async (email, password) => {
  const user = await validateUser(email, password);
  const token = generateToken(user);

  // Return user without password
  const userObj = user.toObject();
  delete userObj.password;

  return { user: userObj, token };
};

export const findOrCreateOAuthUser = async (provider, profile) => {
  const providerIdField = `${provider}Id`;
  const email = profile.emails?.[0]?.value?.toLowerCase();

  // 1. Try to find user by social provider ID
  let user = await User.findOne({ [providerIdField]: profile.id });

  // 2. If not found by ID, but we have an email, try to find by email
  if (!user && email) {
    user = await User.findOne({ email });

    // Link the provider ID to this existing account
    if (user) {
      user[providerIdField] = profile.id;
      // Also update display name if not set
      if (!user.displayName && profile.displayName) {
        user.displayName = profile.displayName;
      }
      await user.save();
      console.log(`✅ Linked existing user ${email} with ${provider} account`);
    }
  }

  // 3. Still not found? Create a new user
  if (!user) {
    console.log(`🆕 Creating new user from ${provider} account: ${email}`);
    user = await User.create({
      [providerIdField]: profile.id,
      name: profile.displayName || profile.name?.givenName || "Unnamed User",
      displayName: profile.displayName || profile.name?.givenName || "Unnamed User",
      email: email || undefined,
      // Default preferences for social users
      emailPreferences: {
        newShops: true,
        routeHighlights: true,
        monthlyUpdates: true,
        specialOffers: false,
      },
      isProfilePrivate: true,
    });
  }

  return user;
};

/**
 * Send password reset OTP
 * @param {string} email - User email
 * @returns {Object} Success message and email
 */
export const sendPasswordResetOTP = async (email) => {
  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists for security
    throw new Error(
      "If an account exists with this email, a reset code will be sent"
    );
  }

  // Generate OTP
  const otp = generateOTP();

  // Delete any existing OTP for this email
  await OTP.deleteMany({ email });

  // Create new OTP record (no password stored for reset)
  const otpRecord = await OTP.create({
    email,
    otp,
    // password not needed for password reset
    name: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  // Send OTP email
  try {
    const { sendPasswordResetOTPEmail } = await import("./emailService.js");
    await sendPasswordResetOTPEmail(email, otp);
  } catch (error) {
    // If email sending fails, delete the OTP record
    await OTP.deleteOne({ _id: otpRecord._id });
    throw error;
  }

  return { message: "Password reset code sent successfully", email };
};

/**
 * Verify password reset OTP
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @returns {Object} Success message
 */
export const verifyPasswordResetOTP = async (email, otp) => {
  // Find OTP record
  const otpRecord = await OTP.findOne({ email, otp });
  if (!otpRecord) throw new Error("Invalid or expired code");

  // Check if OTP is expired
  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new Error("Code has expired");
  }

  // Verify user exists
  const user = await User.findOne({ email });
  if (!user) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new Error("User not found");
  }

  // Don't delete OTP yet - keep it for password reset step
  return { message: "Code verified successfully", email };
};

/**
 * Reset password with new password
 * @param {string} email - User email
 * @param {string} otp - OTP code (for verification)
 * @param {string} newPassword - New password
 * @returns {Object} User object and JWT token
 */
export const resetPassword = async (email, otp, newPassword) => {
  // Find OTP record
  const otpRecord = await OTP.findOne({ email, otp });
  if (!otpRecord) throw new Error("Invalid or expired code");

  // Check if OTP is expired
  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new Error("Code has expired");
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new Error("User not found");
  }

  // Validate new password
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  user.password = hashedPassword;
  await user.save();

  // Delete OTP record
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate token for user
  const token = generateToken(user);

  // Return user without password
  const userObj = user.toObject();
  delete userObj.password;

  return { user: userObj, token, message: "Password reset successfully" };
};
