import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        category: {
            type: String,
            enum: ["bug", "data", "feature", "other"],
            required: true,
        },
        message: {
            type: String,
            required: true,
            maxlength: 500,
        },
        status: {
            type: String,
            enum: ["pending", "reviewed", "resolved"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Feedback", feedbackSchema);
