import dotenv from "dotenv";
dotenv.config({ quiet: true }); // Added quiet option to reduce logs

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo"; // IMPORTANT: Add this import
import cors from "cors";
import bodyParser from "body-parser";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/LocationRoutes.js";
import shopRoutes from "./routes/ShopRoutes.js";
import mongoose from "mongoose"; // Need mongoose for MongoStore
import connectDB from "./config/db.js";

import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import gearpicks from "./routes/gearpick.js";
import routeRoutes from "./routes/route.js";
import donationRoutes from "./routes/donationRoutes.js";
import shopSubscriptionRoutes from "./routes/shopSubscription.js";

// Import webhook handler
import { handleWebhook } from "./controllers/donationController.js";
import { handleShopWebhook } from "./controllers/shopSubscriptionController.js";
import adminRoutes from "./routes/adminRoutes.js";

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
app.use(express.static(path.join(process.cwd(), "public")));

// ✅ FIXED SESSION CONFIGURATION - REPLACED MemoryStore with MongoStore
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 days in seconds
      autoRemove: "native", // Auto-remove expired sessions
      crypto: {
        secret: process.env.SESSION_CRYPTO_SECRET || "default-crypto-secret",
      },
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days in milliseconds
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
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

// ✅ IMPROVED Health check with DB verification
app.get("/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1; // 1 = connected

    const healthStatus = {
      status: isDbConnected ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: isDbConnected ? "connected" : "disconnected",
      databaseState: dbState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };

    res.status(isDbConnected ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Veloclique API",
    version: "1.0.0",
    health: "/health",
    docs: "https://docs.veloclique.com",
  });
});

// Export the app
export default app;
