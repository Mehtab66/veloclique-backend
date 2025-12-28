import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import ClaimRequest from "../models/claimRequest.model.js";
import Shop from "../models/shop.model.js";
import connectDB from "../config/db.js";

const fixClaims = async () => {
    try {
        await connectDB();

        const approvedClaims = await ClaimRequest.find({ status: "approved" });
        console.log(`Found ${approvedClaims.length} approved claims to check.`);

        for (const claim of approvedClaims) {
            console.log(`Processing claim for: ${claim.shopName} (User: ${claim.userId})`);

            let targetShop;
            if (claim.shopId) {
                targetShop = await Shop.findById(claim.shopId);
            } else {
                targetShop = await Shop.findOne({ name: { $regex: new RegExp("^" + claim.shopName + "$", "i") } });
            }

            if (targetShop) {
                if (targetShop.ownerId?.toString() === claim.userId.toString()) {
                    console.log(`  - Shop already has correct owner linking.`);
                } else {
                    targetShop.ownerId = claim.userId;
                    await targetShop.save();
                    console.log(`  - ✅ Successfully linked shop "${targetShop.name}" to owner ${claim.userId}`);
                }
            } else {
                console.log(`  - Shop not found. Creating new shop for name: ${claim.shopName}`);
                await Shop.create({
                    name: claim.shopName,
                    ownerId: claim.userId,
                    phone: claim.phone
                });
                console.log(`  - ✅ Successfully created and linked shop "${claim.shopName}" to owner ${claim.userId}`);
            }
        }

        console.log("Done fixing claims.");
        process.exit(0);
    } catch (error) {
        console.error("Error fixing claims:", error.message);
        process.exit(1);
    }
};

fixClaims();
