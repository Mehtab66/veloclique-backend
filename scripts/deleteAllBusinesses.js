import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Shop from "../models/shop.model.js";

// Connect to database
await connectDB();

console.log("🗑️  Deleting all shops...");

const result = await Shop.deleteMany({});

console.log(`✅ Deleted ${result.deletedCount} shops`);
console.log("✨ Cleanup completed!");
process.exit(0);

