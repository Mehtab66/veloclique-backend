import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null, // Optional - only for authenticated users
        },
        userName: {
            type: String,
            required: true,
        },
        userEmail: {
            type: String,
            default: null, // Optional - for anonymous users who want to provide email
        },
        userAvatar: {
            type: String,
            default: "https://i.pravatar.cc/150?img=1", // Default placeholder
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        isAnonymous: {
            type: Boolean,
            default: function () {
                return !this.userId;
            },
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
reviewSchema.index({ shopId: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
