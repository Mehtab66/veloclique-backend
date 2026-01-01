import express from "express";
import { getContent, updateContent } from "../controllers/contentController.js";
import { authenticate, authorizeAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Public route to fetch content
router.get("/:slug", getContent);

// Admin route to update content
// Assuming 'authorizeAdmin' checks for 'admin' role
// If authorizeAdmin doesn't exist, we'll check req.user.role in controller or use a custom inline middleware
router.put(
    "/:slug",
    authenticate,
    authorizeAdmin, // Ensure only admins can update
    upload.single("image"),
    updateContent
);

export default router;
