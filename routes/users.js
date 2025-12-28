import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  updateProfile,
  changeEmailRequest,
  verifyEmailChange,
  changePassword,
  toggleTwoFactor,
  updateEmailPreferences,
  updatePrivacySettings,
  requestDataExport,
  deleteAccount,
  getActiveSessions,
  endAllSessions,
  getProfile,
  uploadProfilePicture,
} from "../controllers/userController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get("/profile", getProfile);

// Update profile
router.put("/profile", updateProfile);

// Upload profile picture
router.put("/profile-picture", upload.single("profilePicture"), uploadProfilePicture);

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

// Account deletion
router.delete("/account", deleteAccount);

// Session management
router.get("/sessions", getActiveSessions);
router.post("/sessions/end-all", endAllSessions);

export default router;
