import express from "express";
import {
  getShopStates,
  getCitiesByState,
  listShops,
  getShopById,
  getNearbyShops,
  claimShop,
  getMyShopProfile,
  updateMyShopProfile,
  uploadShopImage,
  getListingHealth,
  requestEmailChange,
  verifyEmailChange,
  requestTwoFactorOTP,
  verifyTwoFactorOTP,
  toggleTwoFactor,
  changePassword,
  getActiveSessions,
  endAllSessions,
  getEmailPreferences,
  updateEmailPreferences,
  updatePrivacySettings,
  requestDataExport,
  requestShopDeletion,
  verifyShopDeletion,
} from "../controllers/shopController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/states", getShopStates);
router.get("/states/:state/cities", getCitiesByState);
router.get("/nearby", getNearbyShops);
router.get("/", listShops);
router.post("/claim", authenticate, upload.single("document"), claimShop);

// Shop Owner Routes
router.get("/my-shop", authenticate, getMyShopProfile);
router.put("/my-shop", authenticate, updateMyShopProfile);
router.post("/my-shop/image", authenticate, upload.single("image"), uploadShopImage);
router.get("/my-shop/health", authenticate, getListingHealth);
router.post("/my-shop/request-email-change", authenticate, requestEmailChange);
router.post("/my-shop/verify-email-change", authenticate, verifyEmailChange);

// Shop 2FA Routes
router.post("/my-shop/two-factor/request", authenticate, requestTwoFactorOTP);
router.post("/my-shop/two-factor/verify", authenticate, verifyTwoFactorOTP);
router.put("/my-shop/two-factor/toggle", authenticate, toggleTwoFactor);

// Shop Security Routes
router.put("/my-shop/password", authenticate, changePassword);
router.get("/my-shop/sessions", authenticate, getActiveSessions);
router.post("/my-shop/sessions/end-all", authenticate, endAllSessions);

// Shop Email Preferences
router.get("/my-shop/email-preferences", authenticate, getEmailPreferences);
router.put("/my-shop/email-preferences", authenticate, updateEmailPreferences);

// Shop Privacy & Data Routes
router.put("/my-shop/privacy", authenticate, updatePrivacySettings);
router.post("/my-shop/data-export", authenticate, requestDataExport);
router.post("/my-shop/delete/request", authenticate, requestShopDeletion);
router.post("/my-shop/delete/verify", authenticate, verifyShopDeletion);

// Generic ID route must be last
router.get("/:id", getShopById);

export default router;
