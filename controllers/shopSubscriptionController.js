import { stripe, getShopPriceId } from "../config/stripe.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";

// 1. CREATE CHECKOUT SESSION
export const createShopCheckout = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body; // e.g., { plan: 'climber', billingCycle: 'monthly' }
    const userId = req.user._id;

    // Get user's owned shop
    const user = await User.findById(userId).populate("ownedShop");

    if (!user.ownedShop) {
      return res.status(400).json({
        success: false,
        message:
          "You need to own a shop first. Claim a shop before subscribing.",
      });
    }

    const shop = user.ownedShop;

    // Check if already has active subscription
    if (shop.subscription.status === "active") {
      return res.status(400).json({
        success: false,
        message:
          "Your shop already has an active subscription. Use upgrade instead.",
      });
    }

    // Get Stripe price ID
    const priceId = getShopPriceId(plan, billingCycle);
    if (!priceId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid plan or billing cycle" });
    }

    // Get or create Stripe customer
    let customerId;
    if (user.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString(),
          userType: "shop_owner",
          shopId: shop._id.toString(),
        },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        metadata: {
          shopId: shop._id.toString(),
          shopName: shop.name,
          plan: plan,
          billingCycle: billingCycle,
          userId: userId.toString(),
        },
      },
      // Change these URLs:
      success_url: `${process.env.FRONTEND_URL}/ShopSubscriptionDone?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/ShopSubscriptionDone?canceled=true`,
      metadata: {
        shopId: shop._id.toString(),
        userId: userId.toString(),
        plan: plan,
        billingCycle: billingCycle,
        type: "shop_subscription_new",
      },
      allow_promotion_codes: true,
      customer_update: {
        address: "auto",
        name: "auto",
      },
      billing_address_collection: "auto",
    });

    // Update shop with pending subscription
    shop.subscription.status = "inactive";
    shop.subscription.plan = plan;
    shop.subscription.billingCycle = billingCycle;
    shop.subscription.stripeCustomerId = customerId;
    await shop.save();

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      shopId: shop._id,
      shopName: shop.name,
    });
  } catch (error) {
    console.error("Create shop checkout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 2. GET USER'S SHOP SUBSCRIPTION STATUS
export const getShopSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("ownedShop");

    if (!user.ownedShop) {
      return res.json({
        success: true,
        hasShop: false,
        message: "No shop owned",
      });
    }

    const shop = user.ownedShop;

    // Fetch latest subscription info from Stripe if exists
    let stripeSubscription = null;
    let upcomingInvoice = null;

    if (shop.subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          shop.subscription.stripeSubscriptionId
        );

        // Get upcoming invoice for next payment
        if (stripeSubscription.status === "active") {
          upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            customer: shop.subscription.stripeCustomerId,
            subscription: shop.subscription.stripeSubscriptionId,
          });
        }
      } catch (stripeError) {
        console.warn(
          "Could not fetch Stripe subscription:",
          stripeError.message
        );
      }
    }

    res.json({
      success: true,
      hasShop: true,
      shop: {
        id: shop._id,
        name: shop.name,
        subscription: shop.subscription,
      },
      stripeSubscription,
      upcomingInvoice,
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get subscription status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 3. UPGRADE/DOWNGRADE SUBSCRIPTION
export const updateShopSubscription = async (req, res) => {
  try {
    const { newPlan, newBillingCycle, immediate = false } = req.body;
    const userId = req.user._id;

    // Get user's shop
    const user = await User.findById(userId).populate("ownedShop");
    if (!user.ownedShop) {
      return res.status(404).json({ success: false, message: "No shop found" });
    }

    const shop = user.ownedShop;

    // Validate subscription exists
    if (shop.subscription.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "No active subscription to update" });
    }

    if (!shop.subscription.stripeSubscriptionId) {
      return res
        .status(400)
        .json({ success: false, message: "No Stripe subscription found" });
    }

    // Get new price ID
    const newPriceId = getShopPriceId(
      newPlan,
      newBillingCycle || shop.subscription.billingCycle
    );
    if (!newPriceId) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    // Update Stripe subscription
    const subscription = await stripe.subscriptions.retrieve(
      shop.subscription.stripeSubscriptionId
    );
    const currentItem = subscription.items.data[0];

    const updateParams = {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: immediate ? "always_invoice" : "create_prorations",
      billing_cycle_anchor: immediate ? "now" : "unchanged",
      metadata: {
        ...subscription.metadata,
        previousPlan: shop.subscription.plan,
        newPlan: newPlan,
        updatedAt: new Date().toISOString(),
      },
    };

    const updatedSubscription = await stripe.subscriptions.update(
      shop.subscription.stripeSubscriptionId,
      updateParams
    );

    // Update shop record
    shop.subscription.plan = newPlan;
    if (newBillingCycle) shop.subscription.billingCycle = newBillingCycle;
    shop.subscription.currentPeriodEnd = new Date(
      updatedSubscription.current_period_end * 1000
    );
    await shop.save();

    // Get proration invoice if immediate change
    let prorationInvoice = null;
    if (immediate) {
      try {
        prorationInvoice = await stripe.invoices.retrieve(
          updatedSubscription.latest_invoice
        );
      } catch (error) {
        console.warn("Could not fetch proration invoice:", error.message);
      }
    }

    res.json({
      success: true,
      message: immediate
        ? "Subscription upgraded immediately"
        : "Subscription change scheduled for next billing cycle",
      subscription: shop.subscription,
      prorationInvoice,
      nextPaymentDate: new Date(updatedSubscription.current_period_end * 1000),
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 4. CANCEL SUBSCRIPTION
export const cancelShopSubscription = async (req, res) => {
  try {
    const { cancelAtPeriodEnd = true } = req.body; // true = end of period, false = immediately
    const userId = req.user._id;

    // Get user's shop
    const user = await User.findById(userId).populate("ownedShop");
    if (!user.ownedShop) {
      return res.status(404).json({ success: false, message: "No shop found" });
    }

    const shop = user.ownedShop;

    if (!shop.subscription.stripeSubscriptionId) {
      return res
        .status(400)
        .json({ success: false, message: "No active subscription" });
    }

    if (cancelAtPeriodEnd) {
      // Schedule cancellation at period end
      await stripe.subscriptions.update(
        shop.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      shop.subscription.cancelAtPeriodEnd = true;
      await shop.save();

      res.json({
        success: true,
        message: "Subscription will cancel at period end",
        cancelDate: shop.subscription.currentPeriodEnd,
        currentPeriodEnd: shop.subscription.currentPeriodEnd,
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(shop.subscription.stripeSubscriptionId);

      shop.subscription.status = "canceled";
      shop.subscription.cancelAtPeriodEnd = false;
      await shop.save();

      res.json({
        success: true,
        message: "Subscription canceled immediately",
        refundAvailable: true, // Inform user about potential refund
      });
    }
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 5. GET BILLING PORTAL (for customers to manage their subscription)
export const getBillingPortal = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user.stripeCustomerId) {
      return res
        .status(400)
        .json({ success: false, message: "No Stripe customer found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/shop/dashboard`,
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Get billing portal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create billing portal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 6. GET AVAILABLE PLANS
export const getShopPlans = async (req, res) => {
  try {
    const plans = [
      {
        id: "commuter",
        name: "Commuter",
        title: "(Bronze)",
        monthlyPrice: 19,
        annualPrice: 194,
        features: [
          { text: "Verified listing with priority placement", included: true },
          { text: "City-based search visibility", included: true },
          { text: "Monthly Promotions", included: false },
          { text: "Hotspots carousel placements", included: false },
          { text: "Brand showcase with logo", included: false },
          { text: "Country-wide feature placement", included: false },
          { text: "Homepage feature rotation", included: false },
        ],
        isPopular: false,
      },
      {
        id: "domestique",
        name: "Domestique",
        title: "(Silver)",
        monthlyPrice: 29,
        annualPrice: 296,
        features: [
          { text: "Verified listing with priority placement", included: true },
          { text: "City-based search visibility", included: true },
          { text: "Monthly Promotions", included: true },
          { text: "Hotspots carousel placements", included: false },
          { text: "Brand showcase with logo", included: false },
          { text: "Country-wide feature placement", included: false },
          { text: "Homepage feature rotation", included: false },
        ],
        isPopular: false,
      },
      {
        id: "climber",
        name: "Climber",
        title: "(Gold)",
        monthlyPrice: 39,
        annualPrice: 398,
        features: [
          { text: "Verified listing with priority placement", included: true },
          { text: "City-based search visibility", included: true },
          { text: "Monthly Promotions", included: true },
          { text: "Hotspots carousel placements", included: true },
          { text: "Brand showcase with logo", included: false },
          { text: "Country-wide feature placement", included: false },
          { text: "Homepage feature rotation", included: false },
        ],
        isPopular: true,
      },
      {
        id: "sprinter",
        name: "Sprinter",
        title: "Platinum",
        monthlyPrice: 49,
        annualPrice: 500,
        features: [
          { text: "Verified listing with priority placement", included: true },
          { text: "City-based search visibility", included: true },
          { text: "Monthly Promotions", included: true },
          { text: "Hotspots carousel placements", included: true },
          { text: "Brand showcase with logo", included: true },
          { text: "Country-wide feature placement", included: true },
          { text: "Homepage feature rotation", included: false },
        ],
        isPopular: false,
      },
      {
        id: "gc_podium",
        name: "GC Podium",
        title: "(Diamond)",
        monthlyPrice: 59,
        annualPrice: 602,
        features: [
          { text: "Verified listing with priority placement", included: true },
          { text: "City-based search visibility", included: true },
          { text: "Monthly Promotions", included: true },
          { text: "Hotspots carousel placements", included: true },
          { text: "Brand showcase with logo", included: true },
          { text: "Country-wide feature placement", included: true },
          { text: "Homepage feature rotation", included: true },
        ],
        isPopular: false,
      },
    ];

    res.json({ success: true, plans });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get plans",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 7. VERIFY PAYMENT (frontend calls after redirect)
export const verifyShopPayment = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res
        .status(400)
        .json({ success: false, message: "Session ID is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      // Find shop by metadata
      const shopId = session.metadata?.shopId;
      if (shopId) {
        const shop = await Shop.findById(shopId);
        if (shop && shop.subscription.status === "active") {
          return res.json({
            success: true,
            paymentStatus: "success",
            shop: {
              id: shop._id,
              name: shop.name,
              subscription: shop.subscription,
            },
          });
        }
      }
    }

    res.json({
      success: true,
      paymentStatus: "pending",
      message: "Payment still processing",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// 8. WEBHOOK HANDLER (CRITICAL)
export const handleShopWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(
      "❌ Shop webhook signature verification failed:",
      err.message
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Shop Webhook: ${event.type}`, event.id);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleShopCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleShopSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleShopSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleShopPaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleShopPaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled shop webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Shop webhook handler error:", error);
    res.status(500).json({ error: error.message });
  }
};

// WEBHOOK HELPER FUNCTIONS
const handleShopCheckoutCompleted = async (session) => {
  const { shopId, plan, billingCycle } = session.metadata;
  const subscriptionId = session.subscription;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    console.error(`Shop ${shopId} not found for webhook`);
    return;
  }

  // Calculate period end date
  const periodDays = billingCycle === "annual" ? 365 : 30;
  const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

  // Update shop subscription
  shop.subscription.status = "active";
  shop.subscription.plan = plan;
  shop.subscription.billingCycle = billingCycle;
  shop.subscription.stripeSubscriptionId = subscriptionId;
  shop.subscription.stripeCustomerId = session.customer;
  shop.subscription.currentPeriodStart = new Date();
  shop.subscription.currentPeriodEnd = periodEnd;
  shop.subscription.cancelAtPeriodEnd = false;

  await shop.save();
  console.log(
    `✅ Shop ${shopId} subscription activated: ${plan} (${billingCycle})`
  );
};

const handleShopSubscriptionUpdated = async (subscription) => {
  const shop = await Shop.findOne({
    "subscription.stripeSubscriptionId": subscription.id,
  });
  if (!shop) {
    console.error(`Shop not found for subscription: ${subscription.id}`);
    return;
  }

  // Update status - Map Stripe status to your allowed values
  let mappedStatus = subscription.status;
  if (subscription.status === "trialing") mappedStatus = "trialing";
  else if (subscription.status === "active") mappedStatus = "active";
  else if (subscription.status === "past_due") mappedStatus = "past_due";
  else if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid"
  )
    mappedStatus = "canceled";

  shop.subscription.status = mappedStatus;
  shop.subscription.currentPeriodEnd = new Date(
    subscription.current_period_end * 1000
  );
  shop.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

  // Update plan from metadata if changed
  if (subscription.metadata?.newPlan) {
    shop.subscription.plan = subscription.metadata.newPlan;
  }

  await shop.save();
  console.log(`✅ Shop ${shop._id} subscription updated to: ${mappedStatus}`);
};

const handleShopSubscriptionDeleted = async (subscription) => {
  const shop = await Shop.findOne({
    "subscription.stripeSubscriptionId": subscription.id,
  });
  if (!shop) {
    console.error(
      `Shop not found for deleted subscription: ${subscription.id}`
    );
    return;
  }

  shop.subscription.status = "canceled";
  shop.subscription.cancelAtPeriodEnd = false;
  await shop.save();

  console.log(`✅ Shop ${shop._id} subscription canceled`);
};

const handleShopPaymentSucceeded = async (invoice) => {
  console.log(`✅ Payment succeeded for invoice ${invoice.id}`);
  // Optional: Send payment confirmation email here
};

const handleShopPaymentFailed = async (invoice) => {
  const subscriptionId = invoice.subscription;
  const shop = await Shop.findOne({
    "subscription.stripeSubscriptionId": subscriptionId,
  });
  if (!shop) return;

  shop.subscription.status = "past_due";
  await shop.save();

  console.log(`⚠️ Payment failed for shop ${shop._id}`);
  // Optional: Send payment failure notification here
};
