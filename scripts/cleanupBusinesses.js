import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Shop from "../models/shop.model.js";

// Connect to database
await connectDB();

console.log("🗑️  Cleaning up shops with empty data...");

// Delete businesses where most fields are empty
const result = await Shop.deleteMany({
  $or: [
    { fullAddress: "", streetAddress: "", zip: "" },
    { email: "", website: "", domain: "" },
  ],
});

console.log(`✅ Deleted ${result.deletedCount} shops with empty data`);
console.log("✨ Cleanup completed!");
process.exit(0);

