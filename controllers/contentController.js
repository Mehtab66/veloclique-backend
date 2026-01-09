import FeaturedContent from "../models/featuredContent.model.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Get content by slug
 * Public endpoint
 */
export const getContent = async (req, res) => {
    try {
        const { slug } = req.params;
        console.log("df");

        // Find content, or return default structure if not found (lazy init approach optional, or just 404)
        // Here we'll return null or empty object if not found, let frontend handle defaults
        const content = await FeaturedContent.findOne({ slug });

        res.json({
            success: true,
            data: content || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update content by slug
 * Admin only
 */
export const updateContent = async (req, res) => {
    try {
        const { slug } = req.params;
        const {
            title,
            subtitle,
            description,
            label1,
            label2,
            productLink,
            additionalData
        } = req.body;

        let imageUrl = null;
        let imagePublicId = null;

        // Handle Image Upload
        if (req.file) {
            try {
                const uploadResult = await cloudinary.uploader.upload(
                    `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
                    {
                        folder: "veloclique/featured-content",
                        // You can add transformations here if needed
                    }
                );
                imageUrl = uploadResult.secure_url;
                imagePublicId = uploadResult.public_id;
            } catch (uploadError) {
                return res.status(400).json({
                    success: false,
                    error: "Image upload failed: " + uploadError.message
                });
            }
        }

        // Check if content exists
        let content = await FeaturedContent.findOne({ slug });

        const updateData = {
            title,
            subtitle,
            description,
            label1,
            label2,
            productLink,
            updatedBy: req.user._id
        };

        if (additionalData) {
            try {
                updateData.additionalData = JSON.parse(additionalData);
            } catch (e) {
                // If it's already an object or simple string, use as is
                updateData.additionalData = additionalData;
            }
        }

        if (imageUrl) {
            updateData.image = {
                url: imageUrl,
                publicId: imagePublicId
            };
        }

        if (content) {
            // Update existing
            content = await FeaturedContent.findOneAndUpdate(
                { slug },
                { $set: updateData },
                { new: true }
            );
        } else {
            // Create new
            content = await FeaturedContent.create({
                slug,
                ...updateData
            });
        }

        res.json({
            success: true,
            message: "Content updated successfully",
            data: content
        });

    } catch (error) {
        console.error("Update content error:", error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
