import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    routeLink: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      publicId: String,
      url: String,
    },
    distance: {
      type: String,
      trim: true,
    },
    difficulty: {
      type: String,
      trim: true,
    },
    highlights: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    type: {
      type: String,
      trim: true,
    },
    elevationGain: {
      type: String, // e.g., "1,720 ft"
      trim: true,
    },
    region: {
      type: String,
      trim: true,
      default: "West",
    },
    description: {
      type: String,
      trim: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Route", routeSchema);
