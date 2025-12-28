import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  createShopCheckout,
  getShopSubscription,
  updateShopSubscription,
  cancelShopSubscription,
  getBillingPortal,
  getShopPlans,
  verifyShopPayment,
} from "../controllers/shopSubscriptionController.js";

const router = express.Router();

// Public routes
router.get("/plans", getShopPlans);
router.get("/verify-payment", verifyShopPayment);

// Protected routes (shop owners only)
router.post("/checkout", authenticate, createShopCheckout); // Changed from /:shopId/checkout
router.get("/status", authenticate, getShopSubscription); // Gets user's shop subscription
router.put("/upgrade", authenticate, updateShopSubscription); // Upgrade/downgrade
router.put("/cancel", authenticate, cancelShopSubscription); // Cancel
router.get("/billing-portal", authenticate, getBillingPortal); // Customer portal

export default router;
