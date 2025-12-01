import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true, // Normalize emails
      trim: true,
    },
    password: {
      type: String,
      validate: {
        validator: function (v) {
          // Only validate if local strategy user
          return !v || v.length >= 6;
        },
        message: "Password must be at least 6 characters",
      },
    },
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    appleId: { type: String, sparse: true },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt
  }
);

export default mongoose.model("User", userSchema);



