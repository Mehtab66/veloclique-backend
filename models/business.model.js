import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    fullAddress: String,
    streetAddress: String,
    city: {
      type: String,
      index: true,
    },
    zip: {
      type: String,
      index: true,
    },
    state: {
      type: String,
      index: true,
    },
    country: {
      type: String,
      default: "US",
    },
    timezone: String,
    phone: String,
    email: String,
    website: String,
    domain: String,
    firstCategory: String,
    secondCategory: String,
    claimedGoogleMyBusiness: {
      type: Boolean,
      default: false,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    businessStatus: {
      type: String, // open, closed, temporarily closed, permanently closed
      index: true,
    },
    hours: String,
    hoursByDay: {
      saturday: String,
      sunday: String,
      monday: String,
      tuesday: String,
      wednesday: String,
      thursday: String,
      friday: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    gmbUrl: String,
    googleKnowledgeUrl: String,
    imageUrl: String,
    favicon: String,
    reviewUrl: String,
    phoneFromWebsite: String,
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      youtube: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for location-based queries
businessSchema.index({ location: "2dsphere" });
businessSchema.index({ state: 1, city: 1 });

export default mongoose.model("Business", businessSchema);

