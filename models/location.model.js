import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
      index: true,
    },
    county: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    zipCode: {
      type: String,
      required: true,
      index: true,
    },
    cityType: {
      type: String, // City, Town, etc.
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique combinations
locationSchema.index({ state: 1, county: 1, city: 1, zipCode: 1 }, { unique: true });

export default mongoose.model("Location", locationSchema);

