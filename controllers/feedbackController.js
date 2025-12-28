import { submitFeedback as submitFeedbackService } from "../services/feedbackService.js";

/**
 * Submit feedback
 * POST /feedback
 */
export const submitFeedback = async (req, res) => {
    try {
        const userId = req.user._id;
        const { category, message } = req.body;

        if (!category) {
            return res.status(400).json({
                success: false,
                error: "Category is required",
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required",
            });
        }

        const feedback = await submitFeedbackService(userId, category, message);

        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully. We usually reply within 2 business days.",
            feedback: {
                _id: feedback._id,
                category: feedback.category,
                message: feedback.message,
                createdAt: feedback.createdAt,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};
