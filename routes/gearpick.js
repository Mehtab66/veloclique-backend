import express from "express";
const router = express.Router();
import {
  submitGearPick,
  getGearPicks,
  getGearPicksForAdmin,
  updateGearPickStatus,
  voteOnGearPick,
} from "../controllers/gearpickController.js";

// Public routes
router.get("/", getGearPicks); // GET /api/gear-picks?category=All&sort=Most Voted&page=1&limit=20

// Protected routes
router.post("/", submitGearPick); // POST /api/gear-picks
router.post("/:id/vote", voteOnGearPick); // POST /api/gear-picks/:id/vote

// Admin routes
router.get("/admin/all", getGearPicksForAdmin); // GET /api/gear-picks/admin/all?status=pending&category=All&page=1&limit=20
router.put("/:id/status", updateGearPickStatus); // PUT /api/gear-picks/:id/status

export default router;
