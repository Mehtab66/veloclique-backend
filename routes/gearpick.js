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
  updateGearPickDetails,
  deleteGearPick,
  getGearPickById,
} from "../controllers/gearpickController.js";
import { upload } from "../middleware/upload.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Admin role required." });
  }
};

// Public routes
router.get("/", optionalAuth, getGearPicks); // GET /api/gear-picks?category=All&sort=Most Voted&page=1&limit=20
router.get("/:id", optionalAuth, getGearPickById); // GET /api/gear-picks/:id


// Protected routes
router.post("/", authenticate, submitGearPick); // POST /api/gear-picks
router.post("/:id/vote", authenticate, voteOnGearPick); // POST /api/gear-picks/:id/vote

// Admin routes
router.get("/admin/all", authenticate, isAdmin, getGearPicksForAdmin); // GET /api/gear-picks/admin/all?status=pending&category=All&page=1&limit=20
router.post("/admin/create", authenticate, isAdmin, upload.array("images", 5), createGearPickAsAdmin); // POST /api/gear-picks/admin/create
router.put("/:id/status", authenticate, isAdmin, updateGearPickStatus); // PUT /api/gear-picks/:id/status
router.post("/:id/image", authenticate, isAdmin, upload.array("images", 5), uploadGearPickImage);
router.put("/:id/details", authenticate, isAdmin, updateGearPickDetails);
router.delete("/:id", authenticate, isAdmin, deleteGearPick);
export default router;
