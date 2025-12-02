import express from "express";
import * as subscriptionController from "../controllers/subscriptionController.js";
import * as webhookController from "../controllers/webhookController.js";

const router = express.Router();

const {
  createSubscription,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  updateSubscription,
  getPaymentMethods,
  createSetupIntent,
  getProducts,
} = subscriptionController;

const { handleWebhook } = webhookController;

// Webhook route (must be before body-parser middleware)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Subscription routes
router.post("/subscriptions", createSubscription);
router.get("/subscriptions/user/:userId", getSubscription);
router.put("/subscriptions/user/:userId/cancel", cancelSubscription);
router.put("/subscriptions/user/:userId/resume", resumeSubscription);
router.put("/subscriptions/user/:userId/update", updateSubscription);
router.get("/subscriptions/user/:userId/payment-methods", getPaymentMethods);
router.post("/subscriptions/user/:userId/setup-intent", createSetupIntent);

// Product routes
router.get("/products", getProducts);

export default router;
