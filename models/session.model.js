import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceInfo: String,
    ipAddress: String,
    userAgent: String,
    lastActive: {
      type: Date,
      default: Date.now,
    },
    // expiresAt: {
    //   type: Date,
    //   default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    // },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ user: 1, lastActive: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);
