import express from "express";
import { getPendingApprovals, approveItem, denyItem, getAdminStats } from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ success: false, message: "Access denied. Admin role required." });
    }
};

router.get("/stats", authenticate, isAdmin, getAdminStats);
router.get("/pending-approvals", authenticate, isAdmin, getPendingApprovals);
router.put("/approve/:type/:id", authenticate, isAdmin, approveItem);
router.put("/deny/:type/:id", authenticate, isAdmin, denyItem);

export default router;
