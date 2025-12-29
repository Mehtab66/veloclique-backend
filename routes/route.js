import express from "express";
import {
  createRoute,
  getRoutes,
  getPopularRoutes,
  updateRouteStatus,
  uploadRouteImage,
} from "../controllers/routeController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", upload.single("image"), createRoute);
router.get("/", getRoutes);
router.get("/popular", getPopularRoutes);
router.put("/:id/status", updateRouteStatus);
router.put("/:id/image", upload.single("image"), uploadRouteImage);

export default router;
