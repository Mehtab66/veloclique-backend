import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import connectDB from "../config/db.js";
import Location from "../models/location.model.js";

// Connect to database
await connectDB();

/**
 * Extract state name from filename
 * e.g., "Alaska_County_City_ZIP.csv" -> "Alaska"
 */
const getStateFromFilename = (filename) => {
  const name = path.basename(filename, ".csv");
  // Remove "_County_City_ZIP" or similar suffixes
  let state = name.replace(/_County_City_ZIP$/, "");
  // Capitalize properly
  state = state
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  return state;
};

/**
 * Import locations from CSV file
 */
const importLocationsFromCSV = async (csvFilePath) => {
  try {
    const state = getStateFromFilename(csvFilePath);
    console.log(`📍 Processing state: ${state}`);

    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, "utf-8");

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`📄 Found ${records.length} records in CSV`);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Handle different column name variations
        const county = record["Borough/Census Area"] || record["County"] || record["county"] || "";
        const city = record["Incorporated City"] || record["City/Town"] || record["Census Designated Place (CDP)"] || record["city"] || record["City"] || "";
        const zipCode = record["ZIP Code"] || record["Zip Code"] || record["ZIP"] || record["zipCode"] || record["Zip"] || "";
        const cityType = record["City Class"] || record["Type"] || record["cityType"] || "";

        // Validate required fields
        if (!county || !city || !zipCode) {
          throw new Error(`Missing required fields: county=${!!county}, city=${!!city}, zipCode=${!!zipCode}`);
        }

        // Check if location already exists
        const existing = await Location.findOne({
          state,
          county,
          city,
          zipCode,
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        // Create location
        const location = await Location.create({
          state,
          county,
          city,
          zipCode,
          cityType,
        });

        successCount++;
        if ((i + 1) % 100 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} records...`);
        }
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`❌ Row ${i + 1}: ${error.message}`);
        }
      }
    }

    // Summary
    console.log("\n📊 Import Summary:");
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⏭️  Duplicates skipped: ${duplicateCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    return { successCount, duplicateCount, errorCount };
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    throw error;
  }
};

// Main execution
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error("❌ Please provide CSV file path");
  console.log("Usage: node scripts/importLocations.js <path-to-csv-file>");
  console.log("Example: node scripts/importLocations.js \"d:\\Personal Projects\\backend data\\Alaska_County_City_ZIP.csv\"");
  process.exit(1);
}

const fullPath = path.resolve(csvFilePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`);
  process.exit(1);
}

console.log(`🚀 Starting location import from: ${fullPath}\n`);
await importLocationsFromCSV(fullPath);

console.log("\n✨ Import completed!");
process.exit(0);

