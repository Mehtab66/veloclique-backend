import express from "express";
import {
  createCheckoutSession,
  // handleWebhook removed - now handled in app.js
  getUserDonations,
  getAllDonations,
  updateNameWallPreference,
  verifyDonationSuccess,
  getDonationStats,
  cancelSubscription,
  getNameWallEntries,
  getUserDonationStats,
  getDonationBillingPortal,
} from "../controllers/donationController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// REMOVED: No need for jsonParser since app.js applies it globally
// REMOVED: No webhook route here - it's in app.js

// Public routes
router.post("/create-checkout", createCheckoutSession);
router.get("/verify-success", verifyDonationSuccess);
router.get("/namewall-entries", getNameWallEntries);

// Protected routes
router.get("/my-donations", authenticate, getUserDonations);
router.patch("/:donationId/namewall", authenticate, updateNameWallPreference);
router.patch(
  "/:donationId/cancel-subscription",
  authenticate,
  cancelSubscription
);

// Admin routes
router.get("/all", authenticate, getAllDonations);
router.get("/stats", authenticate, getDonationStats);
// Add this to your donation routes
router.get("/billing-portal", authenticate, getDonationBillingPortal);
router.get("/my-stats", authenticate, getUserDonationStats); // ADD THIS

export default router;
