import express from "express";
import {
  createRoute,
  getRoutes,
  getPopularRoutes,
  updateRouteStatus,
  uploadRouteImage,
  updateRoute,
} from "../controllers/routeController.js";
import { upload } from "../middleware/upload.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", upload.single("image"), createRoute);
router.get("/", optionalAuth, getRoutes); // Use optionalAuth to check admin status
router.get("/popular", getPopularRoutes);
router.put("/:id/status", updateRouteStatus);
router.put("/:id/image", upload.single("image"), uploadRouteImage);
router.put("/:id", updateRoute); // Update route details

export default router;
