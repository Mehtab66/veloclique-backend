import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/user.model.js';
import Shop from './models/shop.model.js';
import ClaimRequest from './models/claimRequest.model.js';

async function fixProBike() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloclique';
        console.log("Connecting to DB...");
        await mongoose.connect(uri);
        console.log("Connected.");

        // IDs provided by user
        const targetUserId = "692f55a23f508db092d518ae";
        const targetClaimId = "694fcdd59ffca1cfeffb3bd3";

        // 1. Find User
        const user = await User.findById(targetUserId);
        if (!user) {
            console.log(`❌ User ${targetUserId} NOT FOUND.`);
            // Try to find by partial ID or similar? No, user gave specific ID.
            // Let's exit if user not found, nothing to link.
            process.exit(1);
        }
        console.log(`✅ User Found: ${user.name} (${user.email})`);
        console.log(`   current role: ${user.role}`);
        console.log(`   current shopId: ${user.shopId}`);

        // 2. Find Shop (User said name is "Pro Bike ")
        // Search by ownerId first
        let shop = await Shop.findOne({ ownerId: user._id });
        if (shop) {
            console.log(`✅ Shop found by ownerId: '${shop.name}' (${shop._id})`);
        } else {
            console.log("⚠️ No shop found linked to this user.");
            // Search by name "Pro Bike " (exact from user data) or regex
            shop = await Shop.findOne({ name: /Pro Bike/i });
            if (shop) {
                console.log(`❓ Found existing shop by name: '${shop.name}' (${shop._id})`);
                console.log(`   Shop ownerId: ${shop.ownerId}`);
            }
        }

        // 3. If Shop found, ensure links. If not, create from Claim data.
        if (shop) {
            // Fix Links
            if (!shop.ownerId || shop.ownerId.toString() !== user._id.toString()) {
                console.log("   -> Fixing Shop.ownerId...");
                shop.ownerId = user._id;
                await shop.save();
            }
            if (!user.shopId || user.shopId.toString() !== shop._id.toString()) {
                console.log("   -> Fixing User.shopId...");
                user.shopId = shop._id;
                user.role = 'shop_owner';
                await user.save();
            }
            console.log("🎉 Links verified/fixed.");
        } else {
            console.log("⚠️ Creating NEW Shop from Claim data...");
            // Try to find the claim to get exact details, though user provided them textually
            const claim = await ClaimRequest.findById(targetClaimId);
            let shopData = {
                name: "Pro Bike",
                email: "probike@gmail.com",
                ownerId: user._id,
                status: "approved"
            };

            if (claim) {
                console.log(`   Found Claim: ${claim.shopName}`);
                shopData.name = claim.shopName;
                shopData.email = claim.businessEmail;
                shopData.phone = claim.phone;
            }

            const newShop = await Shop.create(shopData);
            console.log(`✅ Created Shop: ${newShop._id}`);

            user.shopId = newShop._id;
            user.role = 'shop_owner';
            await user.save();
            console.log("✅ User linked to new Shop.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

fixProBike();
