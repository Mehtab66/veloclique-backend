import ClaimRequest from "../models/claimRequest.model.js";
import GearPick from "../models/gearpick.model.js";
import Route from "../models/route.model.js";
import Shop from "../models/shop.model.js";

export const getPendingApprovals = async (req, res) => {
    // ... existing getPendingApprovals code ...

    try {
        const [claims, gearPicks, routes] = await Promise.all([
            ClaimRequest.find({ status: "pending" }).populate("userId", "name email"),
            GearPick.find({ status: "pending" }).populate("userId", "name email"),
            Route.find({ status: "pending" }).populate("userId", "name email"),
        ]);

        // Format them into a single list for the frontend queue
        const list = [
            ...claims.map((c) => ({
                id: c._id,
                shopName: c.shopName,
                location: c.userId?.name || "Unknown User",
                badge: "unverified",
                requestType: "Claim Shop",
                submittedAt: c.createdAt,
                detailsPreview: c.message || "No message provided",
                itemType: "claim",
                itemData: c.toObject(), // Include full claim data
            })),
            ...gearPicks.map((g) => ({
                id: g._id,
                shopName: g.gearName,
                location: g.userId?.name || "Unknown User",
                badge: "upgrade", // Just a placeholder badge
                requestType: "Gear Pick",
                submittedAt: g.createdAt,
                detailsPreview: g.recommendation,
                itemType: "gearpick",
                itemData: g.toObject(), // Include full gear pick data
            })),
            ...routes.map((r) => ({
                id: r._id,
                shopName: r.title,
                location: r.userId?.name || "Unknown User",
                badge: "verified",
                requestType: "Route Submission",
                submittedAt: r.createdAt,
                detailsPreview: r.location,
                itemType: "route",
                itemData: r.toObject(), // Include full route data
            })),
        ];

        // Sort by date descending
        list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        res.json({ success: true, count: list.length, data: list });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const approveItem = async (req, res) => {
    try {
        const { id, type } = req.params;
        let updated;

        if (type === "claim") {
            const claim = await ClaimRequest.findById(id);
            if (!claim) return res.status(404).json({ success: false, message: "Claim not found" });

            let targetShop;
            if (claim.shopId) {
                targetShop = await Shop.findById(claim.shopId);
            } else {
                // Try to find by name if shopId is missing
                targetShop = await Shop.findOne({ name: { $regex: new RegExp("^" + claim.shopName + "$", "i") } });
            }

            if (targetShop) {
                targetShop.owner = claim.userId;
                // Update specific fields if they were provided in the claim (or merge strategy)
                if (claim.businessEmail) targetShop.email = claim.businessEmail;
                if (claim.phone) targetShop.phone = claim.phone;
                if (claim.message && !targetShop.description) targetShop.description = claim.message;

                await targetShop.save();
            } else {
                // If shop doesn't exist, create it (could be a new shop entry)
                targetShop = await Shop.create({
                    name: claim.shopName,
                    owner: claim.userId,
                    phone: claim.phone,
                    email: claim.businessEmail, // Transfer email
                    description: claim.message, // Transfer message/description
                    status: "approved", // Set shop status
                    location: {
                        type: 'Point',
                        coordinates: [0, 0] // Default or maybe claim has location?
                    },
                    // Initialize structure for rich data so it matches our desired output
                    hoursByDay: {},
                    socialMedia: {}
                });
            }

            // Update user role and shopId
            const User = (await import("../models/user.model.js")).default;
            await User.findByIdAndUpdate(claim.userId, {
                role: "shop_owner",
                ownedShop: targetShop._id,
            });

            claim.status = "approved";
            updated = await claim.save();
        } else if (type === "gearpick") {
            updated = await GearPick.findByIdAndUpdate(id, { status: "approved" }, { new: true });
        } else if (type === "route") {
            updated = await Route.findByIdAndUpdate(id, { status: "approved" }, { new: true });
        }

        if (!updated) return res.status(404).json({ success: false, message: "Item not found" });

        res.json({ success: true, message: "Item approved", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const denyItem = async (req, res) => {
    try {
        const { id, type } = req.params;
        let updated;
        if (type === "claim") {
            updated = await ClaimRequest.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
        } else if (type === "gearpick") {
            updated = await GearPick.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
        } else if (type === "route") {
            updated = await Route.findByIdAndUpdate(id, { status: "rejected" }, { new: true });
        }

        if (!updated) return res.status(404).json({ success: false, message: "Item not found" });

        res.json({ success: true, message: "Item denied", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
