import Feedback from "../models/feedback.model.js";

/**
 * Submit user feedback
 * @param {string} userId - User ID
 * @param {string} category - Feedback category (bug, data, feature, other)
 * @param {string} message - Feedback message
 * @returns {Promise<Object>} Created feedback document
 */
export const submitFeedback = async (userId, category, message) => {
    // Validate category
    const validCategories = ["bug", "data", "feature", "other"];
    if (!validCategories.includes(category)) {
        throw new Error("Invalid feedback category");
    }

    // Validate message
    if (!message || message.trim().length === 0) {
        throw new Error("Feedback message is required");
    }

    if (message.length > 500) {
        throw new Error("Feedback message must not exceed 500 characters");
    }

    // Create feedback
    const feedback = new Feedback({
        userId,
        category,
        message: message.trim(),
    });

    await feedback.save();
    return feedback;
};
