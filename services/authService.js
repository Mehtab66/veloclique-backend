import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import OTP from "../models/otp.model.js";
import { sendOTPEmail } from "./emailService.js";

// Generate 6-digit OTP
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

  // Create user account
  const user = await User.create({
    email: otpRecord.email,
    password: otpRecord.password,
    name: otpRecord.name || null,
  });

  // Delete OTP record after successful registration
  await OTP.deleteOne({ _id: otpRecord._id });

  return user;
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

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid password");

  return user;
};

export const findOrCreateOAuthUser = async (provider, profile) => {
  const query = {};
  query[`${provider}Id`] = profile.id;

  let user = await User.findOne(query);
  if (!user) {
    user = await User.create({
      [provider + "Id"]: profile.id,
      name: profile.displayName || profile.name?.givenName || "Unnamed User",
      email: profile.emails?.[0]?.value || undefined,
    });
  }
  return user;
};
