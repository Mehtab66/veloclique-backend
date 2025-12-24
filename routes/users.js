import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  updateProfile,
  uploadProfilePicture,
  changeEmailRequest,
  verifyEmailChange,
  changePassword,
  toggleTwoFactor,
  updateEmailPreferences,
  updatePrivacySettings,
  requestDataExport,
  requestDeleteAccount,
  verifyDeleteAccount,
  getActiveSessions,
  endAllSessions,
  getProfile,
} from "../controllers/userController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get("/profile", getProfile);

// Update profile
router.put("/profile", updateProfile);

// Upload profile picture
router.put(
  "/profile-picture",
  upload.single("profilePicture"),
  uploadProfilePicture
);

// Email change flow
router.post("/email/change-request", changeEmailRequest);
router.post("/email/verify-change", verifyEmailChange);

// Change password
router.put("/password", changePassword);

// Two-factor authentication
router.put("/two-factor/toggle", toggleTwoFactor);

// Email preferences
router.put("/preferences/email", updateEmailPreferences);

// Privacy settings
router.put("/privacy", updatePrivacySettings);

// Data export
router.post("/data/export", requestDataExport);

// Account deletion (OTP flow)
router.post("/account/delete-request", requestDeleteAccount);
router.post("/account/delete-verify", verifyDeleteAccount);

// Session management
router.get("/sessions", getActiveSessions);
router.post("/sessions/end-all", endAllSessions);

export default router;
