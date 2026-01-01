import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser"; // Import body-parser
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/LocationRoutes.js";
import shopRoutes from "./routes/ShopRoutes.js";
import connectDB from "./config/db.js";

import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import gearpicks from "./routes/gearpick.js";
import routeRoutes from "./routes/route.js";
import donationRoutes from "./routes/donationRoutes.js";
import shopSubscriptionRoutes from "./routes/shopSubscription.js";
import contentRoutes from "./routes/contentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Import webhook handlers
import { handleWebhook } from "./controllers/donationController.js";
import { handleShopWebhook } from "./controllers/shopSubscriptionController.js";

// Initialize Express app
const app = express();


// Connect to MongoDB
connectDB();

// Basic middleware that runs for all routes
app.use(logger("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || [
      "http://localhost:5173",
      "https://www.veloclique.com",
      "https://veloclique.com",
    ],
    credentials: true,
  })
);

// --- WEBHOOK ROUTE with raw body parser ---
app.post(
  "/donation/webhook",
  // Use body-parser.raw() middleware for this specific route only
  bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    // Store the raw body in req.rawBody for Stripe verification
    req.rawBody = req.body.toString();
    console.log("Webhook middleware: rawBody length =", req.rawBody.length);
    console.log(
      "Webhook middleware: First 100 chars =",
      req.rawBody.substring(0, 100)
    );
    next();
  },
  handleWebhook
);
app.post(
  "/shop-subscriptions/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body.toString();
    next();
  },
  handleShopWebhook // New shop subscription webhook handler
);
// --- AFTER webhook route, add JSON parser for all other routes ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// All other routes
app.use(express.static(path.join(process.cwd(), "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRoutes);
app.use("/locations", locationRoutes);
app.use("/shops", shopRoutes);
app.use("/gearpicks", gearpicks);
app.use("/routes", routeRoutes);

// Donation routes (except webhook which is already handled above)
app.use("/donation", donationRoutes);
app.use("/shop-subscriptions", shopSubscriptionRoutes);
app.use("/admin", adminRoutes);
app.use("/content", contentRoutes);


// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
