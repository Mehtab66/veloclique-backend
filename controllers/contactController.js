import Contact from "../models/contact.model.js";
import { sendContactFormEmail, sendContactFormConfirmation } from "../services/emailService.js";

/**
 * Handle contact form submission
 * @route POST /contact-us
 * @access Public
 */
export const createContactMessage = async (req, res) => {
    try {
        const { fullName, email, topic, message } = req.body;
        const file = req.file;

        // Basic validation
        if (!fullName || !email || !topic || !message) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields."
            });
        }

        // Prepare context for model
        const contactData = {
            fullName,
            email,
            topic,
            message
        };

        if (file) {
            contactData.attachment = {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                // If using disk storage, we'd store the path. 
                // For now, assume memory storage for small files to send via email
                url: file.path || `uploads/${file.filename}`
            };
        }

        // Create new contact message in DB
        const newContact = new Contact(contactData);
        await newContact.save();

        // Send emails - wrapped in try-catch to be non-blocking
        try {
            // 1. Admin notification
            await sendContactFormEmail({ fullName, email, topic, message }, file);

            // 2. User confirmation
            const firstName = fullName.split(' ')[0] || "there";
            await sendContactFormConfirmation(email, firstName, topic, message);
        } catch (mailError) {
            console.error("Failed to send contact notification emails:", mailError.message);
        }

        res.status(201).json({
            success: true,
            message: "Your message has been sent successfully. We'll get back to you soon!",
            data: newContact
        });
    } catch (error) {
        console.error("Error in createContactMessage:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message
        });
    }
};

/**
 * Get all contact messages (for admin)
 * @route GET /contact-us
 * @access Private/Admin
 */
export const getAllContactMessages = async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error("Error in getAllContactMessages:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
