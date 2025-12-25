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

    const userId = req.user?._id;
    const user = userId ? await User.findById(userId) : null;

    // Get Stripe price ID
    const priceId = STRIPE_PRICES[frequency][tier][`$${amount}`];
    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount or tier",
      });
    }

    // Create or get Stripe customer
    let customerId;
    if (user?.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else if (user && !user.stripeCustomerId) {
      // Create new Stripe customer for logged-in user
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      user.stripeCustomerId = customerId;
      await user.save();
    } else {
      // Anonymous donor - create customer with minimal info
      const customer = await stripe.customers.create({
        email: anonymousInfo?.email || undefined,
        name: anonymousInfo?.name || undefined,
        metadata: {
          isAnonymous: "true",
        },
      });
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
      success_url: `${process.env.FRONTEND_URL}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/donation-canceled`,
      allow_promotion_codes: true,
      metadata: {
        tier,
        frequency,
        isAnonymous: isAnonymous.toString(),
        showOnNameWall: showOnNameWall.toString(),
        userId: user?._id?.toString() || "anonymous",
        anonymousName: anonymousInfo?.name || "",
        anonymousEmail: anonymousInfo?.email || "",
      },
    });

    // Create donation record in database (pending status)
    const donation = new Donation({
      donorId: userId || null,
      anonymousDonor: isAnonymous
        ? {
            name: anonymousInfo?.name || null,
            email: anonymousInfo?.email || null,
          }
        : null,
      amount,
      currency: "USD",
      tier,
      frequency,
      isAnonymous,
      showOnNameWall,
      stripe: {
        customerId,
        checkoutSessionId: session.id,
      },
      status: "pending",
      metadata: {
        successUrl: session.success_url,
        cancelUrl: session.cancel_url,
      },
    });

    await donation.save();

    // If user is logged in, add donation reference to user
    if (user) {
      user.donations.push(donation._id);
      await user.save();
    }

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
      error: error.message,
    });
  }
};

// Handle Stripe Webhook
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).json({
      success: false,
      message: `Webhook Error: ${err.message}`,
    });
  }

  const session = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCompletedSession(session);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancelled(session);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(session);
        break;
    }

    res.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({
      success: false,
      message: "Webhook handler failed",
      error: error.message,
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
