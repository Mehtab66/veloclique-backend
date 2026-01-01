import ClaimRequest from "../models/claimRequest.model.js";
import GearPick from "../models/gearpick.model.js";
import Route from "../models/route.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";

export const getAdminStats = async (req, res) => {
  try {
    // Get pending approvals count
    const pendingClaimsCount = await ClaimRequest.countDocuments({ status: "pending" });
    const pendingGearPicksCount = await GearPick.countDocuments({ status: "pending" });
    const pendingRoutesCount = await Route.countDocuments({ status: "pending" });
    const pendingApprovalsCount = pendingClaimsCount + pendingGearPicksCount + pendingRoutesCount;

    // Get active verified shops count (shops with subscription.status === 'active')
    const activeVerifiedShopsCount = await Shop.countDocuments({
      "subscription.status": "active",
    });

    // Get new sponsorships this month (shops with active subscription where currentPeriodStart is this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const newSponsorshipsCount = await Shop.countDocuments({
      "subscription.status": "active",
      "subscription.currentPeriodStart": {
        $gte: startOfMonth,
        $lt: endOfMonth,
      },
    });

    // Flagged reviews - for now returning 0 (can be implemented later if review flagging exists)
    const flaggedReviewsCount = 0;

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingApprovalsCount,
        activeVerifiedShops: activeVerifiedShopsCount,
        newSponsorships: newSponsorshipsCount,
        flaggedReviews: flaggedReviewsCount,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get admin statistics",
      error: error.message,
    });
  }
};

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

// export const approveItem = async (req, res) => {
//     try {
//         const { id, type } = req.params;
//         let updated;

//         if (type === "claim") {
//             const claim = await ClaimRequest.findById(id);
//             if (!claim) return res.status(404).json({ success: false, message: "Claim not found" });

//             let targetShop;
//             if (claim.shopId) {
//                 targetShop = await Shop.findById(claim.shopId);
//             } else {
//                 // Try to find by name if shopId is missing
//                 targetShop = await Shop.findOne({ name: { $regex: new RegExp("^" + claim.shopName + "$", "i") } });
//             }

//             if (targetShop) {
//                 targetShop.ownerId = claim.userId;
//                 // Update specific fields if they were provided in the claim (or merge strategy)
//                 if (claim.businessEmail) targetShop.email = claim.businessEmail;
//                 if (claim.phone) targetShop.phone = claim.phone;
//                 if (claim.message && !targetShop.description) targetShop.description = claim.message;

//                 await targetShop.save();
//             } else {
//                 // If shop doesn't exist, create it (could be a new shop entry)
//                 targetShop = await Shop.create({
//                     name: claim.shopName,
//                     ownerId: claim.userId,
//                     phone: claim.phone,
//                     email: claim.businessEmail, // Transfer email
//                     description: claim.message, // Transfer message/description
//                     status: "approved", // Set shop status
//                     location: {
//                         type: 'Point',
//                         coordinates: [0, 0] // Default or maybe claim has location?
//                     },
//                     // Initialize structure for rich data so it matches our desired output
//                     hoursByDay: {},
//                     socialMedia: {}
//                 });
//             }

//             // Update user role and shopId
//             const User = (await import("../models/user.model.js")).default;
//             await User.findByIdAndUpdate(claim.userId, {
//                 role: "shop_owner",
//                 shopId: targetShop._id,
//             });

//             claim.status = "approved";
//             updated = await claim.save();
//         } else if (type === "gearpick") {
//             updated = await GearPick.findByIdAndUpdate(id, { status: "approved" }, { new: true });
//         } else if (type === "route") {
//             updated = await Route.findByIdAndUpdate(id, { status: "approved" }, { new: true });
//         }

//         if (!updated) return res.status(404).json({ success: false, message: "Item not found" });

//         res.json({ success: true, message: "Item approved", data: updated });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };

export const approveItem = async (req, res) => {
  try {
    const { id, type } = req.params;
    let updated;

    if (type === "claim") {
      const claim = await ClaimRequest.findById(id);
      if (!claim)
        return res
          .status(404)
          .json({ success: false, message: "Claim not found" });

      // Get User and validate
      const user = await User.findById(claim.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user already owns a shop (verify the shop actually exists and user is the owner)
      if (user.ownedShop) {
        const existingShop = await Shop.findById(user.ownedShop);
        // Only block if shop exists and user is actually the owner
        if (existingShop && (existingShop.owner?.toString() === claim.userId.toString() || existingShop.ownerId?.toString() === claim.userId.toString())) {
          return res.status(400).json({
            success: false,
            message: "User already owns a shop. One shop per user limit.",
          });
        }
        // If shop doesn't exist or user is not the owner, clear the stale reference
        // We'll allow the claim and update the user's ownedShop later
      }

      let targetShop;
      if (claim.shopId) {
        targetShop = await Shop.findById(claim.shopId);
      } else {
        // Try to find by name if shopId is missing
        targetShop = await Shop.findOne({
          name: { $regex: new RegExp("^" + claim.shopName + "$", "i") },
        });
      }

      if (targetShop) {
        // Check if shop already has an owner (check both owner and ownerId fields for backward compatibility)
        const existingOwner = targetShop.owner || targetShop.ownerId;
        if (existingOwner) {
          return res.status(400).json({
            success: false,
            message: "Shop already has an owner. Cannot be claimed again.",
          });
        }

        // Set owner field (primary field per schema)
        targetShop.owner = claim.userId;

        // Update specific fields if provided
        if (claim.businessEmail) targetShop.email = claim.businessEmail;
        if (claim.phone) targetShop.phone = claim.phone;
        if (claim.message && !targetShop.description)
          targetShop.description = claim.message;

        await targetShop.save();
      } else {
        // Create new shop if doesn't exist
        const newShopData = {
          name: claim.shopName,
          owner: claim.userId,
          phone: claim.phone || "",
          email: claim.businessEmail || "",
          description: claim.message || "",
          // Initialize subscription fields as per your schema
          subscription: {
            status: "inactive",
            plan: null,
            billingCycle: null,
            stripeSubscriptionId: null,
            stripeCustomerId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
          location: {
            type: "Point",
            coordinates: [0, 0],
          },
          hoursByDay: {},
          socialMedia: {},
        };
        
        targetShop = await Shop.create(newShopData);
      }

      // FIXED: Update user with `ownedShop` as per your schema
      await User.findByIdAndUpdate(claim.userId, {
        role: "shop_owner",
        ownedShop: targetShop._id, // Changed from shopId to ownedShop
      });

      claim.status = "approved";
      updated = await claim.save();
    } else if (type === "gearpick") {
      updated = await GearPick.findByIdAndUpdate(
        id,
        { status: "approved" },
        { new: true }
      );
    } else if (type === "route") {
      updated = await Route.findByIdAndUpdate(
        id,
        { status: "approved" },
        { new: true }
      );
    }

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    res.json({
      success: true,
      message: "Item approved",
      data: updated,
    });
  } catch (error) {
    console.error("Approve claim error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const denyItem = async (req, res) => {
  try {
    const { id, type } = req.params;
    let updated;
    if (type === "claim") {
      updated = await ClaimRequest.findByIdAndUpdate(
        id,
        { status: "rejected" },
        { new: true }
      );
    } else if (type === "gearpick") {
      updated = await GearPick.findByIdAndUpdate(
        id,
        { status: "rejected" },
        { new: true }
      );
    } else if (type === "route") {
      updated = await Route.findByIdAndUpdate(
        id,
        { status: "rejected" },
        { new: true }
      );
    }

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    res.json({ success: true, message: "Item denied", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
