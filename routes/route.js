import express from "express";
import {
  createRoute,
  getRoutes,
  updateRouteStatus,
} from "../controllers/routeController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", upload.single("image"), createRoute);
router.get("/", getRoutes);
router.put("/:id/status", updateRouteStatus);

export default router;
