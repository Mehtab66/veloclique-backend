import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        topic: {
            type: String,
            required: true,
            enum: ["General", "Shop updates", "Sponsorships", "Report a problem"]
        },
        message: {
            type: String,
            required: true,
            maxlength: 2000
        },
        status: {
            type: String,
            enum: ["pending", "reviewed", "resolved"],
            default: "pending"
        },
        attachment: {
            url: String,
            filename: String,
            mimetype: String,
            size: Number
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Contact", contactSchema);
