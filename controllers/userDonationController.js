import { stripe } from "../config/stripe.js";
import UserDonation from "../models/userDonation.model.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Create a Stripe Checkout Session for a custom donation amount
 * Note: This uses price_data instead of pre-defined price IDs
 */
export const createDonationSession = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid donation amount is required.",
            });
        }

        let userId = null;
        let user = null;

        // Optional: Authenticate user if token is provided
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.replace("Bearer ", "").trim();
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
                user = await User.findById(userId);
            } catch (error) {
                console.log("Token verification failed in custom donation:", error.message);
            }
        }

        // Amount in cents for Stripe
        const amountInCents = Math.round(amount * 100);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Custom Donation to VéloCliqué",
                            description: "Thank you for supporting the cycling community!",
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/user-donation-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/user-donation-failure`,
            metadata: {
                donationType: "custom_amount",
                userId: userId ? userId.toString() : "anonymous",
                amount: amount.toString(),
            },
            customer_email: user ? user.email : undefined,
        });

        // Save pending donation record
        const donation = new UserDonation({
            userId: userId,
            amount: amount,
            stripeSessionId: session.id,
            status: "pending",
            metadata: {
                frontendUrl: process.env.FRONTEND_URL,
            }
        });

        await donation.save();

        res.json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        console.error("Error creating custom donation session:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create donation session",
            error: error.message,
        });
    }
};

/**
 * Handle Stripe Webhook for custom donations
 */
export const handleUserDonationWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_USER_DONATION_WEBHOOK_SECRET;

    const rawBody = req.rawBody;

    if (!rawBody) {
        return res.status(400).send("Webhook Error: No raw body");
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        // Check if this is a custom donation
        if (session.metadata && session.metadata.donationType === "custom_amount") {
            try {
                const donation = await UserDonation.findOne({ stripeSessionId: session.id });

                if (donation) {
                    donation.status = "completed";
                    donation.paymentIntentId = session.payment_intent;
                    await donation.save();
                    console.log(`Custom donation ${donation._id} marked as completed.`);
                }
            } catch (error) {
                console.error("Error updating custom donation in webhook:", error);
            }
        }
    }

    res.json({ received: true });
};

/**
 * Verify custom donation success after redirect
 */
export const verifyDonationSuccess = async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required",
            });
        }

        // Verify session with Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === "paid") {
            // Find the user donation record
            const donation = await UserDonation.findOne({
                stripeSessionId: session_id,
            });

            if (donation) {
                return res.json({
                    success: true,
                    data: {
                        amount: donation.amount,
                        status: donation.status,
                        createdAt: donation.createdAt,
                        donationType: "custom",
                    },
                });
            }
        }

        res.json({
            success: false,
            message: "Payment not completed or record not found",
        });
    } catch (error) {
        console.error("Error verifying custom donation:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify donation",
            error: error.message,
        });
    }
};
