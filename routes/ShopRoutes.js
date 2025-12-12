import express from "express";
import {
  getShopStates,
  getCitiesByState,
  listShops,
  getShopById,
  getNearbyShops,
} from "../controllers/ShopController.js";

const router = express.Router();

router.get("/states", getShopStates);
router.get("/states/:state/cities", getCitiesByState);
router.get("/nearby", getNearbyShops);
router.get("/", listShops);
router.get("/:id", getShopById);

export default router;

