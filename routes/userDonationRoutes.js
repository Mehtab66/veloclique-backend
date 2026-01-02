import express from "express";
const router = express.Router();
import { createDonationSession } from "../controllers/userDonationController.js";

router.post("/create-checkout", createDonationSession);

export default router;
