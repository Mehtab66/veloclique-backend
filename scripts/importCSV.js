import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";

// Connect to database
await connectDB();

/**
 * Import users from CSV file
 * CSV format should have columns: name, email, password (optional)
 */
const importUsersFromCSV = async (csvFilePath) => {
  try {
    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, "utf-8");

    // Parse CSV
    const records = parse(csvContent, {
      columns: true, // Use first line as column names
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`📄 Found ${records.length} records in CSV`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Validate required fields
        if (!record.name || !record.email) {
          throw new Error("Missing required fields: name or email");
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: record.email.toLowerCase() });
        if (existingUser) {
          console.log(`⏭️  Skipping row ${i + 1}: User with email ${record.email} already exists`);
          continue;
        }

        // Hash password if provided
        let hashedPassword = null;
        if (record.password) {
          hashedPassword = await bcrypt.hash(record.password, 10);
        }

        // Create user
        const user = await User.create({
          name: record.name,
          email: record.email.toLowerCase().trim(),
          password: hashedPassword,
          googleId: record.googleId || undefined,
          facebookId: record.facebookId || undefined,
          appleId: record.appleId || undefined,
        });

        successCount++;
        console.log(`✅ Imported user: ${user.name} (${user.email})`);
      } catch (error) {
        errorCount++;
        const errorMsg = `Row ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Summary
    console.log("\n📊 Import Summary:");
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    if (errors.length > 0) {
      console.log("\nError details:");
      errors.forEach((err) => console.log(`  - ${err}`));
    }
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
};

// Main execution
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error("❌ Please provide CSV file path");
  console.log("Usage: node scripts/importCSV.js <path-to-csv-file>");
  console.log("Example: node scripts/importCSV.js data/users.csv");
  process.exit(1);
}

const fullPath = path.resolve(csvFilePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`);
  process.exit(1);
}

console.log(`🚀 Starting import from: ${fullPath}\n`);
await importUsersFromCSV(fullPath);

console.log("\n✨ Import completed!");
process.exit(0);

