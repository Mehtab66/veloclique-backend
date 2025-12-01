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
} from "../controllers/authController.js";

const router = express.Router();

// Email/Password with OTP
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/register", register);
router.post("/login", login);

// Google
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback, success);

// Facebook
router.get("/facebook", facebookAuth);
router.get("/facebook/callback", facebookCallback, success);

// Apple
router.get("/apple", appleAuth);
router.post("/apple/callback", appleCallback, success);

// Common
router.get("/failure", failure);
router.get("/logout", logout);

export default router;


