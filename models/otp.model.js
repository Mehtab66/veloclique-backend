import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    password: String,
    name: String,
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "10m" },
    },
    type: {
      type: String,
      enum: ["signup", "password-reset", "email-change"],
      default: "signup",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ email: 1, otp: 1 });

export default mongoose.model("OTP", otpSchema);
