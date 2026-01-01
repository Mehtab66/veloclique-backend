import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  updateProfile,
  changeEmailRequest,
  verifyEmailChange,
  changePassword,
  toggleTwoFactor,
  requestTwoFactorOTP,
  verifyTwoFactorOTP,
  updateEmailPreferences,
  updatePrivacySettings,
  requestDataExport,
  deleteAccount,
  getActiveSessions,
  endAllSessions,
  getProfile,
  uploadProfilePicture,
  requestAccountDeletion,
  verifyAccountDeletion,
  getSavedItems,
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
router.put("/two-factor/toggle", toggleTwoFactor); // For disabling or simple toggle if needed
router.post("/two-factor/request", requestTwoFactorOTP);
router.post("/two-factor/verify", verifyTwoFactorOTP);

// Email preferences
router.put("/preferences/email", updateEmailPreferences);

// Privacy settings
router.put("/privacy", updatePrivacySettings);

// Data export
router.post("/data/export", requestDataExport);

// Account deletion
router.post("/account/delete-request", requestAccountDeletion);
router.post("/account/delete-verify", verifyAccountDeletion);
router.delete("/account", deleteAccount); // Legacy

// Session management
router.get("/sessions", getActiveSessions);
router.post("/sessions/end-all", endAllSessions);

// Saved items
router.get("/saved-items", getSavedItems);
import { toggleSaveShop, toggleSaveRoute, toggleSaveGear } from "../controllers/userController.js";
router.post("/saved-shops/:shopId", toggleSaveShop);
router.post("/saved-routes/:routeId", toggleSaveRoute);
router.post("/saved-gear/:gearId", toggleSaveGear);

export default router;