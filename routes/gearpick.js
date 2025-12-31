import express from "express";
const router = express.Router();
import {
  submitGearPick,
  getGearPicks,
  getGearPicksForAdmin,
  updateGearPickStatus,
  voteOnGearPick,
  uploadGearPickImage,
} from "../controllers/gearpickController.js";
import { upload } from "../middleware/upload.js";
import { authenticate } from "../middleware/authMiddleware.js";

// Public routes
router.get("/", getGearPicks); // GET /api/gear-picks?category=All&sort=Most Voted&page=1&limit=20

// Protected routes
// Use upload.any() to handle form data with optional image, or upload.fields([]) for specific fields
// upload.single() requires the field to exist, which can cause issues if image is optional
router.post("/", authenticate, upload.any(), submitGearPick); // POST /api/gear-picks (with optional image upload support)
router.post("/:id/vote",authenticate, voteOnGearPick); // POST /api/gear-picks/:id/vote

// Admin routes
router.get("/admin/all",authenticate, getGearPicksForAdmin); // GET /api/gear-picks/admin/all?status=pending&category=All&page=1&limit=20
router.put("/:id/status",authenticate, updateGearPickStatus); // PUT /api/gear-picks/:id/status
router.post("/:id/image",authenticate, upload.single("image"), uploadGearPickImage);
export default router;
