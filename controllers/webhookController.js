const stripe = require("../config/stripe");
const User = require("../models/User");

// Handle Stripe webhooks
exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

// Handle subscription updated
async function handleSubscriptionUpdated(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscription = {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
    await user.save();
    console.log(`Updated subscription for user: ${user.email}`);
  }
}

// Handle subscription deleted
async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscription.status = "canceled";
    user.subscription.stripeSubscriptionId = null;
    await user.save();
    console.log(`Canceled subscription for user: ${user.email}`);
  }
}

// Handle invoice payment succeeded
async function handleInvoicePaymentSucceeded(invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription
    );
    await handleSubscriptionUpdated(subscription);
  }
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(invoice) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer });
  if (user) {
    // Send email notification about payment failure
    console.log(`Payment failed for user: ${user.email}`);
    // Implement your email notification logic here
  }
}
