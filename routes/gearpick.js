import express from "express";
const router = express.Router();
import {
  submitGearPick,
  getGearPicks,
  getGearPicksForAdmin,
  updateGearPickStatus,
  voteOnGearPick,
  uploadGearPickImage,
  createGearPickAsAdmin,
} from "../controllers/gearpickController.js";
import { upload } from "../middleware/upload.js";
import { authenticate } from "../middleware/authMiddleware.js";

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Admin role required." });
  }
};

// Public routes
router.get("/", getGearPicks); // GET /api/gear-picks?category=All&sort=Most Voted&page=1&limit=20

// Protected routes
router.post("/",authenticate, submitGearPick); // POST /api/gear-picks
router.post("/:id/vote",authenticate, voteOnGearPick); // POST /api/gear-picks/:id/vote

// Admin routes
router.get("/admin/all", authenticate, isAdmin, getGearPicksForAdmin); // GET /api/gear-picks/admin/all?status=pending&category=All&page=1&limit=20
router.post("/admin/create", authenticate, isAdmin, upload.single("image"), createGearPickAsAdmin); // POST /api/gear-picks/admin/create
router.put("/:id/status", authenticate, isAdmin, updateGearPickStatus); // PUT /api/gear-picks/:id/status
router.post("/:id/image", authenticate, isAdmin, upload.single("image"), uploadGearPickImage);
export default router;
