const stripe = require("../config/stripe");
const User = require("../models/User");

// Create Stripe customer and subscription
exports.createSubscription = async (req, res) => {
  try {
    const { priceId, email, payment_method } = req.body;

    // Idempotency key
    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey) {
      return res.status(400).json({ error: "Idempotency key required" });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create Stripe customer
      const customer = await stripe.customers.create(
        {
          email,
          payment_method,
          invoice_settings: {
            default_payment_method: payment_method,
          },
        },
        {
          idempotencyKey: `${idempotencyKey}-customer`,
        }
      );

      // Create user in database
      user = new User({
        email,
        stripeCustomerId: customer.id,
      });
    } else {
      // Update existing customer's payment method
      await stripe.customers.update(
        user.stripeCustomerId,
        {
          payment_method,
          invoice_settings: {
            default_payment_method: payment_method,
          },
        },
        {
          idempotencyKey: `${idempotencyKey}-update-customer`,
        }
      );
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create(
      {
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      },
      {
        idempotencyKey: `${idempotencyKey}-subscription`,
      }
    );

    // Update user subscription info
    user.subscription = {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      priceId: priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    await user.save();

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get subscription details
exports.getSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || !user.subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const subscription = await stripe.subscriptions.retrieve(
      user.subscription.stripeSubscriptionId,
      { expand: ["customer.default_source"] }
    );

    res.json({
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: subscription.items.data[0].price.id,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;

    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey) {
      return res.status(400).json({ error: "Idempotency key required" });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    let subscription;

    if (cancelAtPeriodEnd) {
      // Schedule cancellation at period end
      subscription = await stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        { cancel_at_period_end: true },
        { idempotencyKey: `${idempotencyKey}-cancel` }
      );
    } else {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(
        user.subscription.stripeSubscriptionId,
        { idempotencyKey: `${idempotencyKey}-cancel-immediate` }
      );
    }

    // Update user record
    user.subscription.status = subscription.status;
    user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    await user.save();

    res.json({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Resume subscription
exports.resumeSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey) {
      return res.status(400).json({ error: "Idempotency key required" });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: false },
      { idempotencyKey: `${idempotencyKey}-resume` }
    );

    // Update user record
    user.subscription.status = subscription.status;
    user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    await user.save();

    res.json({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Resume subscription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Update subscription (change plan)
exports.updateSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPriceId } = req.body;

    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey) {
      return res.status(400).json({ error: "Idempotency key required" });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const subscription = await stripe.subscriptions.retrieve(
      user.subscription.stripeSubscriptionId
    );

    const updatedSubscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      },
      { idempotencyKey: `${idempotencyKey}-update` }
    );

    // Update user record
    user.subscription.priceId = newPriceId;
    user.subscription.status = updatedSubscription.status;
    await user.save();

    res.json({
      status: updatedSubscription.status,
      priceId: newPriceId,
      currentPeriodEnd: updatedSubscription.current_period_end,
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get payment methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    res.json(paymentMethods.data);
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Create setup intent for adding payment method
exports.createSetupIntent = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error("Create setup intent error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get all products with prices
exports.getProducts = async (req, res) => {
  try {
    const products = await stripe.products.list({
      active: true,
      expand: ["data.default_price"],
    });

    res.json(products.data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
