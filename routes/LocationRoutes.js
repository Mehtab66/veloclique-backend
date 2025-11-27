import express from "express";
import {
  getStates,
  getCountiesByState,
  getCitiesByStateAndCounty,
} from "../controllers/locationController.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/states/:state/counties", getCountiesByState);
router.get("/states/:state/counties/:county/cities", getCitiesByStateAndCounty);

export default router;
