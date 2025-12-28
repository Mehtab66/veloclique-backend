import express from "express";
import {
  getShopStates,
  getCitiesByState,
  listShops,
  getShopById,
  getNearbyShops,
  claimShop,
  getMyShopProfile,
  updateMyShopProfile,
  uploadShopImage,
  getListingHealth,
} from "../controllers/ShopController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/states", getShopStates);
router.get("/states/:state/cities", getCitiesByState);
router.get("/nearby", getNearbyShops);
router.get("/", listShops);
router.post("/claim", authenticate, upload.single("document"), claimShop);

// Shop Owner Routes
router.get("/my-shop", authenticate, getMyShopProfile);
router.put("/my-shop", authenticate, updateMyShopProfile);
router.post("/my-shop/image", authenticate, upload.single("image"), uploadShopImage);
router.get("/my-shop/health", authenticate, getListingHealth);

// Generic ID route must be last
router.get("/:id", getShopById);

export default router;
