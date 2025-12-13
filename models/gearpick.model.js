import mongoose from "mongoose";

const GearPickSchema = new mongoose.Schema(
  {
    gearName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "All",
        "Bikes",
        "Wheels",
        "Components",
        "Helmets",
        "Apparel",
        "Pedals",
        "Tools",
        "Tires",
        "Electronics",
        "Accessories",
      ],
    },
    productLink: {
      type: String,
      default: "",
    },
    recommendation: {
      type: String,
      required: true,
      maxlength: 200,
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
    votes: {
      type: Number,
      default: 0,
    },
    image: {
      publicId: {
        type: String,
      },
      url: {
        type: String,
      },
    },

    voteHistory: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        vote: {
          type: Number,
          enum: [1, -1],
        },
        votedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create index for better performance
GearPickSchema.index({ category: 1, status: 1, votes: -1 });
GearPickSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Gearpick", GearPickSchema);
