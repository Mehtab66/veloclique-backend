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

// Public routes
router.post("/create-checkout", createCheckoutSession);

// Stripe Webhook - Manual raw body parsing for Stripe
router.post(
  "/webhook",
  (req, res, next) => {
    let data = "";

    // Set encoding to get raw string data
    req.setEncoding("utf8");

    // Collect chunks of data
    req.on("data", (chunk) => {
      data += chunk;
    });

    // When all data is received
    req.on("end", () => {
      // Store raw body for webhook verification
      req.rawBody = data;

      // Try to parse JSON for convenience (but keep rawBody for Stripe)
      try {
        if (data) {
          req.body = JSON.parse(data);
        } else {
          req.body = {};
        }
      } catch (error) {
        req.body = {};
      }

      next();
    });
  },
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
