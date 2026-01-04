import express from "express";
import {
  createRoute,
  getRoutes,
  getPopularRoutes,
  updateRouteStatus,
  uploadRouteImage,
  createRouteAsAdmin,
  updateRouteFeature,
  updateRouteDetails
} from "../controllers/routeController.js";
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

const router = express.Router();

router.post("/", upload.single("image"), createRoute);
router.get("/", getRoutes);
router.get("/popular", getPopularRoutes);
router.put("/:id/status", updateRouteStatus);
router.put("/:id/image", upload.single("image"), uploadRouteImage);

// Admin routes
router.post("/admin/create", authenticate, isAdmin, upload.single("image"), createRouteAsAdmin);
router.put("/:id/feature", authenticate, isAdmin, updateRouteFeature);
router.put("/:id/details", authenticate, isAdmin, updateRouteDetails);

export default router;
