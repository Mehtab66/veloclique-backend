import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

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
