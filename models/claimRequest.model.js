import mongoose from "mongoose";

const claimRequestSchema = new mongoose.Schema(
    {
        shopName: {
            type: String,
            required: true,
        },
        businessEmail: {
            type: String,
            required: true,
        },
        phone: String,
        message: String,
        documentUrl: String, // Business License or Tax ID document
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
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("ClaimRequest", claimRequestSchema);
