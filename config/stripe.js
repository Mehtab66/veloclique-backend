import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

// Conditional Stripe initialization
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
} else {
  console.warn("⚠️  Stripe not configured - STRIPE_SECRET_KEY required for payment functionality");
  // Create a mock stripe object that will throw errors if used
  stripe = new Proxy({}, {
    get() {
      throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env file");
    }
  });
}

export { stripe };

// Stripe Price IDs (create these in Stripe Dashboard)
export const STRIPE_PRICES = {
  // One-time prices
  "one-time": {
    Peloton: {
      $5: process.env.STRIPE_PRICE_PELOTON_5_ONETIME,
      $10: process.env.STRIPE_PRICE_PELOTON_10_ONETIME,
      $25: process.env.STRIPE_PRICE_PELOTON_25_ONETIME,
    },
    Breakaway: {
      $26: process.env.STRIPE_PRICE_BREAKAWAY_26_ONETIME,
      $40: process.env.STRIPE_PRICE_BREAKAWAY_40_ONETIME,
      $50: process.env.STRIPE_PRICE_BREAKAWAY_50_ONETIME,
    },
    "Yellow Jersey": {
      $51: process.env.STRIPE_PRICE_YELLOWJERSEY_51_ONETIME,
      $75: process.env.STRIPE_PRICE_YELLOWJERSEY_75_ONETIME,
      $100: process.env.STRIPE_PRICE_YELLOWJERSEY_100_ONETIME,
    },
  },
  // Monthly subscription prices
  monthly: {
    Peloton: {
      $5: process.env.STRIPE_PRICE_PELOTON_5_MONTHLY,
      $10: process.env.STRIPE_PRICE_PELOTON_10_MONTHLY,
      $25: process.env.STRIPE_PRICE_PELOTON_25_MONTHLY,
    },
    Breakaway: {
      $26: process.env.STRIPE_PRICE_BREAKAWAY_26_MONTHLY,
      $40: process.env.STRIPE_PRICE_BREAKAWAY_40_MONTHLY,
      $50: process.env.STRIPE_PRICE_BREAKAWAY_50_MONTHLY,
    },
    "Yellow Jersey": {
      $51: process.env.STRIPE_PRICE_YELLOWJERSEY_51_MONTHLY,
      $75: process.env.STRIPE_PRICE_YELLOWJERSEY_75_MONTHLY,
      $100: process.env.STRIPE_PRICE_YELLOWJERSEY_100_MONTHLY,
    },
  },
};

// Add SHOP_PRICES object (parallel to your existing STRIPE_PRICES)
export const SHOP_PRICES = {
  // Monthly prices
  monthly: {
    commuter: process.env.STRIPE_SHOP_COMMUTER_MONTHLY, // $19
    domestique: process.env.STRIPE_SHOP_DOMESTIQUE_MONTHLY, // $29
    climber: process.env.STRIPE_SHOP_CLIMBER_MONTHLY, // $39
    sprinter: process.env.STRIPE_SHOP_SPRINTER_MONTHLY, // $49
    gc_podium: process.env.STRIPE_SHOP_GC_PODIUM_MONTHLY, // $59
  },
  // Annual prices
  annual: {
    commuter: process.env.STRIPE_SHOP_COMMUTER_ANNUAL, // $194
    domestique: process.env.STRIPE_SHOP_DOMESTIQUE_ANNUAL, // $296
    climber: process.env.STRIPE_SHOP_CLIMBER_ANNUAL, // $398
    sprinter: process.env.STRIPE_SHOP_SPRINTER_ANNUAL, // $500
    gc_podium: process.env.STRIPE_SHOP_GC_PODIUM_ANNUAL, // $602
  },
};

export function getShopPriceId(plan, interval) {
  if (!SHOP_PRICES[interval]) {
    throw new Error(`Invalid billing interval: ${interval}`);
  }

  const priceId = SHOP_PRICES[interval][plan];

  if (!priceId) {
    throw new Error(`Invalid shop plan: ${plan} for interval: ${interval}`);
  }

  return priceId;
}
