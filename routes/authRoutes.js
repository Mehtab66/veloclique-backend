import express from "express";
import {
  register,
  login,
  sendOTP,
  verifyOTP,
  googleAuth,
  googleCallback,
  facebookAuth,
  facebookCallback,
  appleAuth,
  appleCallback,
  success,
  failure,
  logout,
  getMe,
  sendForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetPasswordController,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Email/Password with OTP
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/register", register);
router.post("/login", login);

// Google OAuth
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback, success);

// Facebook
router.get("/facebook", facebookAuth);
router.get("/facebook/callback", facebookCallback, success);

// Apple
router.get("/apple", appleAuth);
router.post("/apple/callback", appleCallback, success);

// Password Reset`
router.post("/forgot-password", sendForgotPasswordOTP);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOTP);
router.post("/reset-password", resetPasswordController);

// Common
router.get("/failure", failure);
router.get("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;


