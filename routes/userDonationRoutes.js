import express from "express";
const router = express.Router();
import { createDonationSession, verifyDonationSuccess } from "../controllers/userDonationController.js";

router.post("/create-checkout", createDonationSession);
router.get("/verify-success", verifyDonationSuccess);

export default router;
