import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
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
      type: String,
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
        type: [Number],
        index: "2dsphere",
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Subscription Details
    subscription: {
      status: {
        type: String,
        enum: ["inactive", "active", "past_due", "canceled", "trialing"],
        default: "inactive",
      },
      plan: {
        type: String,
        enum: ["commuter", "domestique", "climber", "sprinter", "gc_podium"],
        default: null,
      },
      billingCycle: {
        type: String,
        enum: ["monthly", "annual"],
        default: null,
      },
      stripeSubscriptionId: String,
      stripeCustomerId: String,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },

  {
    timestamps: true,
  }
);

shopSchema.index({ state: 1, city: 1 });

export default mongoose.model("Shop", shopSchema);
