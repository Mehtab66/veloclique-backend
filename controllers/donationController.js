import { stripe, STRIPE_PRICES } from "../config/stripe.js";
import Donation from "../models/donation.model.js";
import User from "../models/user.model.js";

// Create Checkout Session
export const createCheckoutSession = async (req, res) => {
  try {
    const {
      amount,
      tier,
      frequency,
      isAnonymous,
      showOnNameWall,
      anonymousInfo,
    } = req.body;

    // Check if user is authenticated via token
    let userId = null;
    let user = null;

    // If there's an Authorization header, try to get the user
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        user = await User.findById(userId);
      } catch (error) {
        console.log("Invalid or expired token, proceeding as anonymous");
        // Don't throw error, just proceed as anonymous
      }
    }

    // Get Stripe price ID
    const priceId = STRIPE_PRICES[frequency]?.[tier]?.[`$${amount}`];
    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount or tier",
      });
    }

    // Determine if donation should be anonymous
    // If user is not logged in OR explicitly chooses anonymous, mark as anonymous
    const finalIsAnonymous = !user || isAnonymous === true;

    // Create or get Stripe customer
    let customerId;
    let isAnonymousDonation = false;

    if (user?.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else if (user) {
      // Create new Stripe customer for logged-in user
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          userType: "registered",
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      user.stripeCustomerId = customerId;
      await user.save();
    } else {
      // Anonymous donor - create customer with minimal info
      isAnonymousDonation = true;
      const customerData = {
        metadata: {
          isAnonymous: "true",
          donationTier: tier,
          donationFrequency: frequency,
        },
      };

      // Only add email/name if provided
      if (anonymousInfo?.email) {
        customerData.email = anonymousInfo.email;
      }
      if (anonymousInfo?.name) {
        customerData.name = anonymousInfo.name;
      }

      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: frequency === "monthly" ? "subscription" : "payment",
      success_url: `${
        process.env.FRONTEND_URL || "https://veloclique.com"
      }/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "https://veloclique.com"
      }/donation-canceled`,
      allow_promotion_codes: true,
      metadata: {
        tier,
        frequency,
        isAnonymous: finalIsAnonymous.toString(),
        showOnNameWall: finalIsAnonymous ? "true" : showOnNameWall.toString(),
        userId: user?._id?.toString() || "anonymous",
        anonymousName: anonymousInfo?.name || "",
        anonymousEmail: anonymousInfo?.email || "",
        amount: amount.toString(),
      },
      // Allow customer to update their info
      customer_update: {
        address: "auto",
        name: "auto",
      },
      billing_address_collection: "auto",
    });

    // Create donation record in database (pending status)
    const donation = new Donation({
      donorId: userId || null,
      anonymousDonor: finalIsAnonymous
        ? {
            name: anonymousInfo?.name || null,
            email: anonymousInfo?.email || null,
          }
        : null,
      amount,
      currency: "USD",
      tier,
      frequency,
      isAnonymous: finalIsAnonymous,
      showOnNameWall: finalIsAnonymous ? true : showOnNameWall, // Always show anonymous on name wall
      stripe: {
        customerId,
        checkoutSessionId: session.id,
      },
      status: "pending",
      metadata: {
        successUrl: session.success_url,
        cancelUrl: session.cancel_url,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    await donation.save();

    // If user is logged in, add donation reference to user
    if (user) {
      user.donations.push(donation._id);
      await user.save();
    }

    console.log(
      `Checkout session created for ${tier} $${amount} - ${
        finalIsAnonymous ? "Anonymous" : "User: " + userId
      }`
    );

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      donationId: donation._id,
      isAnonymous: finalIsAnonymous,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
// Handle Stripe Webhook
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Use req.rawBody that should be set by your middleware
  const rawBody = req.rawBody;

  // Debug logging
  console.log("Webhook received with headers:", {
    "stripe-signature": sig ? "Present" : "Missing",
    "content-type": req.headers["content-type"],
    "content-length": req.headers["content-length"],
  });

  console.log("req.rawBody exists:", !!rawBody);
  console.log("req.rawBody type:", typeof rawBody);
  console.log("req.rawBody length:", rawBody?.length);

  // Log a preview of the raw body for debugging
  if (rawBody) {
    console.log("First 200 chars of rawBody:", rawBody.substring(0, 200));
  }

  if (!rawBody) {
    console.error("ERROR: No rawBody available for webhook verification");
    console.error("Available properties on req:", Object.keys(req));
    return res.status(400).json({
      success: false,
      message: "Webhook requires raw body",
    });
  }

  // Validate endpoint secret
  if (!endpointSecret) {
    console.error("ERROR: STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({
      success: false,
      message: "Webhook secret not configured",
    });
  }

  let event;

  try {
    // Use rawBody string for signature verification
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log(
      `✅ Webhook signature verified for event: ${event.type} (ID: ${event.id})`
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    console.error("Error details:", err);
    console.error("Raw body length:", rawBody.length);
    console.error("Raw body first 500 chars:", rawBody.substring(0, 500));
    console.error("Stripe signature header:", sig);
    console.error("Expected webhook secret configured:", !!endpointSecret);

    return res.status(400).json({
      success: false,
      message: `Webhook signature verification failed: ${err.message}`,
    });
  }

  // Extract the session object from the event
  const session = event.data.object;
  console.log(`📩 Webhook processing: ${event.type}`, session.id);
  console.log(
    `Event data:`,
    JSON.stringify(event.data, null, 2).substring(0, 500)
  );

  try {
    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        console.log("Processing checkout.session.completed");
        await handleCompletedSession(session);
        break;

      case "customer.subscription.deleted":
        console.log("Processing customer.subscription.deleted");
        await handleSubscriptionCancelled(session);
        break;

      case "invoice.payment_failed":
        console.log("Processing invoice.payment_failed");
        await handlePaymentFailed(session);
        break;

      case "checkout.session.async_payment_succeeded":
        console.log("Processing checkout.session.async_payment_succeeded");
        await handleCompletedSession(session);
        break;

      case "checkout.session.async_payment_failed":
        console.log("Processing checkout.session.async_payment_failed");
        // Handle failed payment
        break;

      // Add other event types as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
        // Still return success so Stripe doesn't retry
        return res.json({
          success: true,
          message: `Received unhandled event type: ${event.type}`,
          received: true,
        });
    }

    // Return success response
    res.json({
      success: true,
      received: true,
      eventType: event.type,
      eventId: event.id,
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    console.error("Error stack:", error.stack);

    // IMPORTANT: Return 200 to Stripe even on error
    // Otherwise Stripe will keep retrying
    res.status(200).json({
      success: false,
      message: "Webhook handler failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      received: true,
    });
  }
};
// Helper function: Handle completed session
const handleCompletedSession = async (session) => {
  const sessionId = session.id;
  const metadata = session.metadata || {};

  // Find the donation record
  const donation = await Donation.findOne({
    "stripe.checkoutSessionId": sessionId,
  });

  if (!donation) {
    throw new Error(`Donation not found for session: ${sessionId}`);
  }

  // Update donation status
  donation.status = "completed";
  donation.stripe.paymentIntentId = session.payment_intent;

  if (session.subscription) {
    donation.stripe.subscriptionId = session.subscription;
    donation.subscriptionEndsAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
    );
  }

  await donation.save();

  // Grant badge to user if not anonymous
  if (!donation.isAnonymous && donation.donorId) {
    await grantBadge(donation);
  }

  // Add to name wall if requested
  if (donation.showOnNameWall) {
    await addToNameWall(donation);
  }

  console.log(`Donation ${donation._id} completed successfully`);
};

// Helper function: Grant badge to user
const grantBadge = async (donation) => {
  const user = await User.findById(donation.donorId);
  if (!user) return;

  // Check if user already has this tier badge
  const existingBadge = user.badges.find(
    (badge) => badge.tier === donation.tier && badge.isActive
  );

  if (!existingBadge) {
    user.badges.push({
      tier: donation.tier,
      grantedAt: new Date(),
      expiresAt:
        donation.frequency === "monthly" ? donation.subscriptionEndsAt : null,
      isActive: true,
      sourceDonation: donation._id,
    });

    await user.save();
    console.log(`Badge ${donation.tier} granted to user ${user._id}`);
  }
};

// Helper function: Add to name wall
const addToNameWall = async (donation) => {
  // Implementation for adding to name wall
  // This depends on how your name wall is structured
  console.log(`Adding ${donation._id} to name wall`);

  // Example implementation if you have a NameWall model:
  /*
  const NameWall = require('../models/nameWall.model');
  const nameWallEntry = new NameWall({
    donationId: donation._id,
    donorId: donation.donorId,
    anonymousName: donation.anonymousDonor?.name,
    tier: donation.tier,
    amount: donation.amount,
    isVisible: donation.showOnNameWall
  });
  await nameWallEntry.save();
  */
};

// Helper function: Handle subscription cancelled
const handleSubscriptionCancelled = async (session) => {
  const subscription = session.object;

  // Find donation with this subscription
  const donation = await Donation.findOne({
    "stripe.subscriptionId": subscription.id,
  });

  if (donation) {
    donation.status = "canceled";
    donation.isActive = false;
    await donation.save();

    // Deactivate badge if it was subscription-based
    if (donation.donorId) {
      const user = await User.findById(donation.donorId);
      if (user) {
        const badge = user.badges.find(
          (b) =>
            b.sourceDonation &&
            b.sourceDonation.toString() === donation._id.toString()
        );
        if (badge) {
          badge.isActive = false;
          await user.save();
          console.log(`Badge deactivated for user ${user._id}`);
        }
      }
    }
  }
};

// Helper function: Handle payment failed
const handlePaymentFailed = async (session) => {
  const invoice = session.object;
  const subscriptionId = invoice.subscription;

  // Update donation status to failed
  const donation = await Donation.findOneAndUpdate(
    { "stripe.subscriptionId": subscriptionId },
    { status: "failed" },
    { new: true }
  );

  if (donation && donation.donorId) {
    const user = await User.findById(donation.donorId);
    if (user) {
      const badge = user.badges.find(
        (b) =>
          b.sourceDonation &&
          b.sourceDonation.toString() === donation._id.toString()
      );
      if (badge) {
        badge.isActive = false;
        await user.save();
        console.log(
          `Badge deactivated due to failed payment for user ${user._id}`
        );
      }
    }
  }
};

// Get user's donation history
export const getUserDonations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const donations = await Donation.find({ donorId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Donation.countDocuments({ donorId: userId });

    res.json({
      success: true,
      count: donations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: donations,
    });
  } catch (error) {
    console.error("Get user donations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch donations",
      error: error.message,
    });
  }
};

// Get all donations (admin only)
export const getAllDonations = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // Filtering options
    const {
      status,
      tier,
      frequency,
      isAnonymous,
      page = 1,
      limit = 20,
      sort = "-createdAt",
      search = "",
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (tier) query.tier = tier;
    if (frequency) query.frequency = frequency;
    if (isAnonymous !== undefined) query.isAnonymous = isAnonymous === "true";

    // Search by donor name or email
    if (search) {
      query.$or = [
        { "anonymousDonor.name": { $regex: search, $options: "i" } },
        { "anonymousDonor.email": { $regex: search, $options: "i" } },
      ];

      // Also search by user if populated
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      if (users.length > 0) {
        query.$or.push({ donorId: { $in: users.map((u) => u._id) } });
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const donations = await Donation.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("donorId", "name email");

    const total = await Donation.countDocuments(query);

    res.json({
      success: true,
      count: donations.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: donations,
    });
  } catch (error) {
    console.error("Get all donations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update name wall preference
export const updateNameWallPreference = async (req, res) => {
  try {
    const { showOnNameWall, displayName } = req.body;
    const donationId = req.params.donationId;

    const donation = await Donation.findOne({
      _id: donationId,
      donorId: req.user._id,
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    donation.showOnNameWall = showOnNameWall;
    if (displayName && donation.isAnonymous) {
      donation.anonymousDonor.name = displayName;
    }

    await donation.save();

    res.json({
      success: true,
      message: "Name wall preference updated",
      data: donation,
    });
  } catch (error) {
    console.error("Update name wall preference error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update preference",
      error: error.message,
    });
  }
};

// Verify donation success (called from frontend after redirect)
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
      // Find donation and return success
      const donation = await Donation.findOne({
        "stripe.checkoutSessionId": session_id,
      });

      if (donation) {
        return res.json({
          success: true,
          data: {
            amount: donation.amount,
            tier: donation.tier,
            frequency: donation.frequency,
            isAnonymous: donation.isAnonymous,
            showOnNameWall: donation.showOnNameWall,
            createdAt: donation.createdAt,
          },
        });
      }
    }

    res.json({
      success: false,
      message: "Payment not completed",
    });
  } catch (error) {
    console.error("Error verifying donation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify donation",
      error: error.message,
    });
  }
};

// Get donation statistics
export const getDonationStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // Get total donations
    const totalDonations = await Donation.countDocuments({
      status: "completed",
    });

    // Get total amount
    const totalAmountResult = await Donation.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAmount =
      totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    // Get donations by tier
    const donationsByTier = await Donation.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$tier",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Get donations by frequency
    const donationsByFrequency = await Donation.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$frequency",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Donation.aggregate([
      { $match: { status: "completed", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalDonations,
        totalAmount,
        donationsByTier,
        donationsByFrequency,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Get donation stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get donation statistics",
      error: error.message,
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { donationId } = req.params;

    const donation = await Donation.findOne({
      _id: donationId,
      donorId: req.user._id,
      frequency: "monthly",
      status: "completed",
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Cancel subscription in Stripe
    await stripe.subscriptions.cancel(donation.stripe.subscriptionId);

    // Update donation status
    donation.status = "canceled";
    donation.isActive = false;
    await donation.save();

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
      error: error.message,
    });
  }
};
// Get name wall entries
// Get name wall entries
export const getNameWallEntries = async (req, res) => {
  try {
    // Find all completed donations that should be shown on name wall
    const donations = await Donation.find({
      status: "completed",
      showOnNameWall: true,
    })
      .populate("donorId", "name displayName")
      .sort({
        // Sort by tier priority, then amount, then date
        tier: 1,
        amount: -1,
        createdAt: -1,
      })
      .limit(1000);

    // Format donations for name wall display
    const formattedEntries = donations.map((donation) => {
      // For anonymous donors, always show as "Anonymous"
      if (donation.isAnonymous) {
        return {
          displayName: "Anonymous",
          amount: donation.amount,
          tier: donation.tier,
          isAnonymous: true,
          createdAt: donation.createdAt,
          // Include anonymous donor info if available (for admin view)
          originalInfo: donation.anonymousDonor,
        };
      }

      // For registered users
      return {
        displayName:
          donation.donorId?.displayName ||
          donation.donorId?.name ||
          "Supporter",
        amount: donation.amount,
        tier: donation.tier,
        isAnonymous: false,
        createdAt: donation.createdAt,
        userId: donation.donorId?._id,
      };
    });

    res.json({
      success: true,
      count: formattedEntries.length,
      data: formattedEntries,
    });
  } catch (error) {
    console.error("Error fetching name wall entries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch name wall entries",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
