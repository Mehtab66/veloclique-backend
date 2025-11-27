import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import connectDB from "../config/db.js";
import Shop from "../models/shop.model.js";

// Connect to database
await connectDB();

/**
 * Extract state name from filename
 * e.g., "alaska_vc_data.csv" -> "Alaska"
 */
const getStateFromFilename = (filename) => {
  const name = path.basename(filename, ".csv");
  const state = name.replace(/_vc_data$/, "").replace(/_/g, " ");
  return state
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Parse latitude/longitude from string like "Lat 61.5852333" or "Lng -149.4542878"
 */
const parseCoordinate = (coordString) => {
  if (!coordString) return null;
  const match = coordString.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
};

/**
 * Import shops from CSV file
 */
const importShopsFromCSV = async (csvFilePath) => {
  try {
    const state = getStateFromFilename(csvFilePath);
    console.log(`\n🏢 Processing shops for: ${state}`);

    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, "utf-8");

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      skip_records_with_error: false,
    });

    console.log(`📄 Found ${records.length} records in CSV`);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // Validate required fields
        if (!record.Name || !record.Name.trim()) {
          continue;
        }

        // Check if shop already exists (by name, address, and city)
        const existing = await Shop.findOne({
          name: record.Name.trim(),
          city: record.City || "",
          streetAddress: record.Street_Address || "",
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        // Parse coordinates
        const latitude = parseCoordinate(record.Latitude);
        const longitude = parseCoordinate(record.Longitude);

        // Parse reviews count and rating
        const reviewsCount = record.Reviews_count ? parseInt(record.Reviews_count) || 0 : 0;
        const averageRating = record.Average_rating ? parseFloat(record.Average_rating) || 0 : 0;

        // Helper function to clean and get value
        const getValue = (value) => {
          if (!value) return "";
          const cleaned = String(value).trim();
          return cleaned || "";
        };

        // Create shop
        const shop = await Shop.create({
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
        if ((i + 1) % 50 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} records...`);
        }
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errorCount++;
          // Only show first 10 errors to avoid spam
          if (errorCount <= 10) {
            console.error(`❌ Row ${i + 1}: ${error.message}`);
            if (errorCount === 10) {
              console.error(`   ... (showing first 10 errors only)`);
            }
          }
        }
      }
    }

    // Summary
    console.log(`\n📊 Summary for ${state}:`);
    console.log(`  ✅ Successfully imported: ${successCount}`);
    console.log(`  ⏭️  Duplicates skipped: ${duplicateCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    return { successCount, duplicateCount, errorCount };
  } catch (error) {
    console.error(`❌ Import failed for ${csvFilePath}:`, error.message);
    throw error;
  }
};

// Main execution
const dataDirectory = process.argv[2] || path.join(process.cwd(), "data");

if (!fs.existsSync(dataDirectory)) {
  console.error(`❌ Directory not found: ${dataDirectory}`);
  console.log("Usage: node scripts/importAllShops.js [data-directory]");
  console.log("Example: node scripts/importAllShops.js ./data");
  process.exit(1);
}

console.log(`🚀 Starting shop import from: ${dataDirectory}\n`);

// List of shop CSV files to import
const shopFiles = [
  "alaska_vc_data.csv",
  "arizona_vc_data.csv",
  "california_vc_data.csv",
  "colorado_vc_data.csv",
  "hawaii_vc_data.csv",
  "nevada_vc_data.csv",
  "new_mexico_vc_data.csv",
  "oregon_vc_data.csv",
  "utah_vc_data.csv",
  "washington_vc_data.csv",
];

let totalSuccess = 0;
let totalDuplicates = 0;
let totalErrors = 0;

// Import each shop file
for (const fileName of shopFiles) {
  const filePath = path.join(dataDirectory, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`⚠️  File not found: ${filePath}`);
    continue;
  }

  try {
    const result = await importShopsFromCSV(filePath);
    totalSuccess += result.successCount;
    totalDuplicates += result.duplicateCount;
    totalErrors += result.errorCount;
  } catch (error) {
    console.error(`❌ Failed to import ${fileName}:`, error.message);
    totalErrors++;
  }
}

// Final summary
console.log("\n" + "=".repeat(60));
console.log("FINAL SUMMARY");
console.log("=".repeat(60));
console.log(`✅ Total successfully imported: ${totalSuccess}`);
console.log(`⏭️  Total duplicates skipped: ${totalDuplicates}`);
console.log(`❌ Total errors: ${totalErrors}`);
console.log("\n✨ All shop imports completed!");
process.exit(0);

