import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import connectDB from "../config/db.js";
import Location from "../models/location.model.js";
import Shop from "../models/shop.model.js";

// Connect to database
await connectDB();

/**
 * Extract state name from filename
 */
const getStateFromFilename = (filename, isLocation = false) => {
  const name = path.basename(filename, ".csv");
  if (isLocation) {
    // For location files: "Alaska_County_City_ZIP" -> "Alaska"
    // Handle "New_Mexico" -> "New Mexico"
    let state = name.replace(/_[^_]+$/, "").replace(/_County_City_ZIP$/, "");
    // Capitalize properly
    state = state
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    return state;
  } else {
    const state = name.replace(/_vc_data$/, "").replace(/_/g, " ");
    return state
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
};

/**
 * Parse latitude/longitude from string
 */
const parseCoordinate = (coordString) => {
  if (!coordString) return null;
  const match = coordString.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
};

/**
 * Import locations from CSV
 */
const importLocations = async (csvFilePath) => {
  try {
    const state = getStateFromFilename(csvFilePath, true);
    console.log(`\n📍 Processing locations for: ${state}`);

    const csvContent = fs.readFileSync(csvFilePath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Handle inconsistent column counts
    });

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Helper to clean values
        const getValue = (value) => {
          if (!value) return "";
          return String(value).trim();
        };

        const county = getValue(record["Borough/Census Area"] || record["County"] || record["county"]);
        const city = getValue(record["Incorporated City"] || record["City/Town"] || record["city"] || record["City"]);
        const zipCode = getValue(record["ZIP Code"] || record["Zip Code"] || record["ZIP"] || record["zipCode"] || record["Zip"]);
        const cityType = getValue(record["City Class"] || record["Type"] || record["cityType"]);

        if (!county || !city || !zipCode) {
          continue;
        }

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

        await Location.create({
          state,
          county,
          city,
          zipCode,
          cityType,
        });

        successCount++;
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log(`  ✅ Imported: ${successCount}, ⏭️  Duplicates: ${duplicateCount}, ❌ Errors: ${errorCount}`);
    return { successCount, duplicateCount, errorCount };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { successCount: 0, duplicateCount: 0, errorCount: 1 };
  }
};

/**
 * Import shops from CSV
 */
const importShops = async (csvFilePath) => {
  try {
    const state = getStateFromFilename(csvFilePath, false);
    console.log(`\n🏢 Processing shops for: ${state}`);

    const csvContent = fs.readFileSync(csvFilePath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        if (!record.Name || !record.Name.trim()) {
          continue;
        }

        const existing = await Shop.findOne({
          name: record.Name.trim(),
          city: record.City || "",
          streetAddress: record.Street_Address || "",
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        const latitude = parseCoordinate(record.Latitude);
        const longitude = parseCoordinate(record.Longitude);
        const reviewsCount = record.Reviews_count ? parseInt(record.Reviews_count) || 0 : 0;
        const averageRating = record.Average_rating ? parseFloat(record.Average_rating) || 0 : 0;

        // Helper function to clean and get value
        const getValue = (value) => {
          if (!value) return "";
          const cleaned = String(value).trim();
          return cleaned || "";
        };

        await Shop.create({
          name: getValue(record.Name),
          fullAddress: getValue(record.Full_Address),
          streetAddress: getValue(record.Street_Address),
          city: getValue(record.City),
          zip: getValue(record.Zip),
          state: getValue(record.State) || state,
          country: getValue(record.Country) || "US",
          timezone: getValue(record.Timezone),
          phone: getValue(record.Phone_1),
          email: getValue(record.Email),
          website: getValue(record.Website),
          domain: getValue(record.Domain),
          firstCategory: getValue(record.First_category),
          secondCategory: getValue(record.Second_category),
          claimedGoogleMyBusiness: getValue(record.Claimed_google_my_business) === "Yes",
          reviewsCount,
          averageRating,
          businessStatus: getValue(record["Business Status"]) || "open",
          hours: getValue(record.Hours),
          hoursByDay: {
            saturday: getValue(record.Saturday),
            sunday: getValue(record.Sunday),
            monday: getValue(record.Monday),
            tuesday: getValue(record.Tuesday),
            wednesday: getValue(record.Wednesday),
            thursday: getValue(record.Thursday),
            friday: getValue(record.Friday),
          },
          location: latitude && longitude ? {
            type: "Point",
            coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
          } : undefined,
          gmbUrl: getValue(record.GMB_URL),
          googleKnowledgeUrl: getValue(record.Google_Knowledge_URL),
          imageUrl: getValue(record.Image_URL),
          favicon: getValue(record.Favicon),
          reviewUrl: getValue(record.Review_URL),
          phoneFromWebsite: getValue(record["Phone From WEBSITE"]),
          socialMedia: {
            facebook: getValue(record["Facebook URL"]),
            twitter: getValue(record["Twitter URL"]),
            instagram: getValue(record["Instagram URL"]),
            youtube: getValue(record["Youtube URL"]),
          },
        });

        successCount++;
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log(`  ✅ Imported: ${successCount}, ⏭️  Duplicates: ${duplicateCount}, ❌ Errors: ${errorCount}`);
    return { successCount, duplicateCount, errorCount };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { successCount: 0, duplicateCount: 0, errorCount: 1 };
  }
};

/**
 * Recursively find all CSV files in a directory
 */
const findCSVFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search in subdirectories
      findCSVFiles(filePath, fileList);
    } else if (file.endsWith(".csv")) {
      fileList.push(filePath);
    }
  });

  return fileList;
};

// Main execution
const dataDirectory = process.argv[2] || path.join(process.cwd(), "data");

if (!fs.existsSync(dataDirectory)) {
  console.error(`❌ Directory not found: ${dataDirectory}`);
  console.log("Usage: node scripts/importAllCSV.js [data-directory]");
  console.log("Example: node scripts/importAllCSV.js ./data");
  console.log("Example: node scripts/importAllCSV.js \"d:\\Personal Projects\\backend data\"");
  process.exit(1);
}

console.log(`🚀 Starting bulk import from: ${dataDirectory}\n`);

// Step 1: Delete all existing data
console.log("=".repeat(60));
console.log("CLEANING EXISTING DATA");
console.log("=".repeat(60));

console.log("\n🗑️  Deleting all locations...");
const locationDeleteResult = await Location.deleteMany({});
console.log(`✅ Deleted ${locationDeleteResult.deletedCount} locations`);

console.log("\n🗑️  Deleting all shops...");
const shopDeleteResult = await Shop.deleteMany({});
console.log(`✅ Deleted ${shopDeleteResult.deletedCount} shops`);

console.log("\n✨ Cleanup completed!\n");

// Step 2: Find all CSV files recursively
const allFiles = findCSVFiles(dataDirectory);

if (allFiles.length === 0) {
  console.error("❌ No CSV files found in directory or subdirectories");
  process.exit(1);
}

console.log(`📁 Found ${allFiles.length} CSV files (including subdirectories)\n`);

// Separate location and business files
const locationFiles = allFiles.filter((filePath) => {
  const fileName = path.basename(filePath);
  return (
    fileName.includes("County_City_ZIP") ||
    (fileName.includes("County") && !fileName.includes("vc_data"))
  );
});

const businessFiles = allFiles.filter((filePath) => {
  const fileName = path.basename(filePath);
  return fileName.includes("vc_data");
});

console.log(`📍 Location files: ${locationFiles.length}`);
console.log(`🏢 Shop files: ${businessFiles.length}\n`);

let totalLocations = { successCount: 0, duplicateCount: 0, errorCount: 0 };
let totalShops = { successCount: 0, duplicateCount: 0, errorCount: 0 };

// Import locations
if (locationFiles.length > 0) {
  console.log("=".repeat(60));
  console.log("IMPORTING LOCATIONS");
  console.log("=".repeat(60));
  
  for (const filePath of locationFiles) {
    const result = await importLocations(filePath);
    totalLocations.successCount += result.successCount;
    totalLocations.duplicateCount += result.duplicateCount;
    totalLocations.errorCount += result.errorCount;
  }
}

// Import shops
if (businessFiles.length > 0) {
  console.log("\n" + "=".repeat(60));
  console.log("IMPORTING SHOPS");
  console.log("=".repeat(60));
  
  for (const filePath of businessFiles) {
    const result = await importShops(filePath);
    totalShops.successCount += result.successCount;
    totalShops.duplicateCount += result.duplicateCount;
    totalShops.errorCount += result.errorCount;
  }
}

// Final summary
console.log("\n" + "=".repeat(60));
console.log("FINAL SUMMARY");
console.log("=".repeat(60));
console.log("\n📍 LOCATIONS:");
console.log(`  ✅ Successfully imported: ${totalLocations.successCount}`);
console.log(`  ⏭️  Duplicates skipped: ${totalLocations.duplicateCount}`);
console.log(`  ❌ Errors: ${totalLocations.errorCount}`);

console.log("\n🏢 SHOPS:");
console.log(`  ✅ Successfully imported: ${totalShops.successCount}`);
console.log(`  ⏭️  Duplicates skipped: ${totalShops.duplicateCount}`);
console.log(`  ❌ Errors: ${totalShops.errorCount}`);

console.log("\n✨ All imports completed!");
process.exit(0);

