import mongoose from "mongoose";

const FeaturedContentSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        title: {
            type: String,
            default: "",
        },
        subtitle: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        label1: {
            type: String,
            default: ""
        },
        label2: {
            type: String,
            default: ""
        },
        productLink: {
            type: String,
            default: ""
        },
        buttonText: {
            type: String,
            default: ""
        },
        image: {
            publicId: String,
            url: String,
        },
        additionalData: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("FeaturedContent", FeaturedContentSchema);
