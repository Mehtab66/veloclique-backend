import express from "express";
import {
  createCheckoutSession,
  handleWebhook,
  getUserDonations,
  getAllDonations,
  updateNameWallPreference,
  verifyDonationSuccess,
  getDonationStats,
  cancelSubscription,
  getNameWallEntries,
} from "../controllers/donationController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// IMPORTANT: Add JSON parsing middleware for ALL routes EXCEPT webhook
const jsonParser = express.json();

// Public routes - these need JSON parsing
router.post("/create-checkout", jsonParser, createCheckoutSession);
router.get("/verify-success", verifyDonationSuccess);
router.get("/namewall-entries", getNameWallEntries);

// Stripe Webhook - RAW body parsing (NO jsonParser here!)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Protected routes
router.get("/my-donations", authenticate, getUserDonations);
router.patch(
  "/:donationId/namewall",
  jsonParser,
  authenticate,
  updateNameWallPreference
);
router.patch(
  "/:donationId/cancel-subscription",
  jsonParser,
  authenticate,
  cancelSubscription
);

// Admin routes
router.get("/all", authenticate, getAllDonations);
router.get("/stats", authenticate, getDonationStats);

export default router;
