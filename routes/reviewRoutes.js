import express from "express";
import { addReview, getShopReviews } from "../controllers/reviews.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /reviews - Add a new review (open to all users, uses optionalAuth)
router.post("/", optionalAuth, addReview);

// GET /reviews/:shopId - Get all reviews for a shop (public)
router.get("/:shopId", getShopReviews);

export default router;
