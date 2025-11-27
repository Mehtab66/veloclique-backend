import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Location from "../models/location.model.js";

// Connect to database
await connectDB();

console.log("🗑️  Deleting all locations...");

const result = await Location.deleteMany({});

console.log(`✅ Deleted ${result.deletedCount} locations`);
console.log("✨ Cleanup completed!");
process.exit(0);

