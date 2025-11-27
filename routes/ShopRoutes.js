import express from "express";
import {
  getShopStates,
  getCitiesByState,
  listShops,
  getShopById,
} from "../controllers/ShopController.js";

const router = express.Router();

router.get("/states", getShopStates);
router.get("/states/:state/cities", getCitiesByState);
router.get("/", listShops);
router.get("/:id", getShopById);

export default router;

