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
import bodyParser from "body-parser";

const router = express.Router();

// Public routes
router.post("/create-checkout", createCheckoutSession);
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  handleWebhook
);
router.get("/verify-success", verifyDonationSuccess);

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
router.get("/namewall-entries", getNameWallEntries);
export default router;
