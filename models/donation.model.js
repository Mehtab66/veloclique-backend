import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
  // Donor Information
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    sparse: true,
  },
  anonymousDonor: {
    name: { type: String, default: null },
    email: { type: String, default: null },
  },

  // Donation Details
  amount: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  tier: {
    type: String,
    enum: ["Peloton", "Breakaway", "Yellow Jersey"],
    required: true,
  },
  frequency: {
    type: String,
    enum: ["one-time", "monthly"],
    required: true,
  },

  // User Preferences
  isAnonymous: { type: Boolean, default: false },
  showOnNameWall: { type: Boolean, default: true },

  // Stripe Information
  stripe: {
    customerId: { type: String, default: null },
    paymentIntentId: { type: String, default: null },
    subscriptionId: { type: String, default: null },
    checkoutSessionId: { type: String, required: true },
  },

  // Status & Metadata
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "canceled"],
    default: "pending",
  },
  metadata: mongoose.Schema.Types.Mixed,

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // For monthly subscriptions
  subscriptionEndsAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
});

// Indexes for better query performance
donationSchema.index({ donorId: 1, createdAt: -1 });
donationSchema.index({ status: 1 });
donationSchema.index({ "stripe.checkoutSessionId": 1 }, { unique: true });

// export const Donation = mongoose.model("Donation", donationSchema);
export default mongoose.model("Donation", donationSchema);
