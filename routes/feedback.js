import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { submitFeedback } from "../controllers/feedbackController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Submit feedback
router.post("/", submitFeedback);

export default router;
