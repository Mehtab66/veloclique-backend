import express from "express";
import multer from "multer";
import { createContactMessage, getAllContactMessages } from "../controllers/contactController.js";

const router = express.Router();

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 } // 500KB limit
});

/**
 * @route POST /contact-us
 * @desc Submit a contact form with optional attachment
 * @access Public
 */
router.post("/", upload.single('attachment'), createContactMessage);

/**
 * @route GET /contact-us
 * @desc Get all contact messages (for admin)
 * @access Private/Admin
 */
router.get("/", getAllContactMessages);

export default router;
