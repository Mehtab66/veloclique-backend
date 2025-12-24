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
  },
  { timestamps: true }
);

export default mongoose.model("Route", routeSchema);
