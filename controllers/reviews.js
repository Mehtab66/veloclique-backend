import Review from "../models/review.model.js";
import Shop from "../models/shop.model.js";
import mongoose from "mongoose";

/**
 * Add a new review for a shop
 * Open to both authenticated and anonymous users
 */
export const addReview = async (req, res) => {
    try {
        const { shopId, rating, comment, userName, userEmail } = req.body;

        // Validate required fields
        if (!shopId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                error: "Shop ID, rating, and comment are required",
            });
        }

        // Validate shopId format
        if (!mongoose.Types.ObjectId.isValid(shopId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid shop ID",
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: "Rating must be between 1 and 5",
            });
        }

        // Check if shop exists
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({
                success: false,
                error: "Shop not found",
            });
        }

        // Prepare review data based on authentication status
        let reviewData = {
            shopId,
            rating: Number(rating),
            comment: comment.trim(),
        };

        // If user is authenticated (req.user exists from optionalAuth middleware)
        if (req.user) {
            reviewData.userId = req.user._id;
            reviewData.userName = req.user.name || req.user.displayName || "Anonymous User";
            reviewData.userAvatar = req.user.profilePicture || "https://i.pravatar.cc/150?img=1";
            reviewData.isAnonymous = false;
        } else {
            // Anonymous user - require userName
            if (!userName || !userName.trim()) {
                return res.status(400).json({
                    success: false,
                    error: "Name is required for anonymous reviews",
                });
            }
            reviewData.userName = userName.trim();
            reviewData.userEmail = userEmail?.trim() || null;
            reviewData.userAvatar = "https://i.pravatar.cc/150?img=1";
            reviewData.isAnonymous = true;
        }

        // Create the review
        const review = await Review.create(reviewData);

        // Update shop's review count and average rating
        const reviews = await Review.find({ shopId });
        const totalReviews = reviews.length;
        const averageRating =
            reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

        await Shop.findByIdAndUpdate(shopId, {
            reviewsCount: totalReviews,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        });

        res.status(201).json({
            success: true,
            message: "Review added successfully",
            review,
        });
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({
            success: false,
            error: "Failed to add review",
            message: error.message,
        });
    }
};

/**
 * Get all reviews for a specific shop
 * Public endpoint with pagination
 */
export const getShopReviews = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Validate shopId
        if (!mongoose.Types.ObjectId.isValid(shopId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid shop ID",
            });
        }

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
        const skip = (parsedPage - 1) * parsedLimit;

        // Fetch reviews with pagination
        const [reviews, total] = await Promise.all([
            Review.find({ shopId })
                .sort({ createdAt: -1 }) // Newest first
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Review.countDocuments({ shopId }),
        ]);

        res.json({
            success: true,
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit) || 1,
            reviews,
        });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch reviews",
            message: error.message,
        });
    }
};
