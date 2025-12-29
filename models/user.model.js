import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    displayName: String,
    profilePicture: {
      type: String, // Cloudinary URL
      default: "https://via.placeholder.com/150",
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    newEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    emailChangeOTP: String,
    emailChangeOTPExpires: Date,
    accountDeleteOTP: String,
    accountDeleteOTPExpires: Date,
    password: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || v.length >= 6;
        },
        message: "Password must be at least 6 characters",
      },
    },
    passwordChangedAt: Date,
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    appleId: { type: String, sparse: true },

    // Profile Information
    role: {
      type: String,
      enum: ["user", "shop_owner", "admin"],
      default: "user",
    },
    city: String,
    state: String,

    // Security Settings
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    twoFactorOTP: String,
    twoFactorOTPExpires: Date,

    // Email Preferences
    emailPreferences: {
      newShops: { type: Boolean, default: true },
      routeHighlights: { type: Boolean, default: true },
      monthlyUpdates: { type: Boolean, default: true },
      specialOffers: { type: Boolean, default: false },
    },

    // Privacy Settings
    isProfilePrivate: { type: Boolean, default: true },

    // Session Management
    sessions: [
      {
        token: String,
        deviceInfo: String,
        ipAddress: String,
        lastActive: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Data Export
    dataExport: {
      downloadLink: String,
      expiresAt: Date,
      requestedAt: Date,
    },
    stripeCustomerId: { type: String, sparse: true },
    donations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donation" }],
    badges: [
      {
        tier: {
          type: String,
          enum: ["Peloton", "Breakaway", "Yellow Jersey"],
        },
        grantedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: null }, // null = permanent badge
        isActive: { type: Boolean, default: true },
        sourceDonation: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Donation",
        },
      },
    ],
    nameWallPreferences: {
      displayName: { type: String, default: "" },
      isVisible: { type: Boolean, default: true },
      tierToShow: { type: String, default: "highest" }, // 'highest' or 'current'
    },
    ownedShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to get user data without sensitive information
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.twoFactorSecret;
  delete user.emailChangeOTP;
  delete user.emailChangeOTPExpires;
  delete user.accountDeleteOTP;
  delete user.accountDeleteOTPExpires;
  delete user.twoFactorOTP;
  delete user.twoFactorOTPExpires;
  delete user.sessions;
  delete user.dataExport;
  return user;
};

export default mongoose.model("User", userSchema);
