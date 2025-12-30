import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
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

// ✅ FIXED: Async function to import connect-mongo properly
let MongoStore = null;
let mongoStoreAvailable = false;

// Async function to initialize session store
async function initializeSessionStore() {
  try {
    // For connect-mongo v6+, the import structure is different
    const connectMongoModule = await import("connect-mongo");

    // Check what the module exports
    if (connectMongoModule.default) {
      // v5 style export
      MongoStore = connectMongoModule.default;
    } else if (connectMongoModule.MongoStore) {
      // Named export
      MongoStore = connectMongoModule.MongoStore;
    } else {
      // Try to find any export that looks like MongoStore
      const possibleExports = Object.values(connectMongoModule);
      MongoStore =
        possibleExports.find(
          (exp) => exp && exp.name && exp.name.includes("Store")
        ) || possibleExports[0];
    }

    mongoStoreAvailable = true;
    console.log("✅ connect-mongo loaded successfully");
  } catch (error) {
    console.error("Failed to import connect-mongo:", error.message);
    console.log("Falling back to MemoryStore - NOT RECOMMENDED FOR PRODUCTION");
    mongoStoreAvailable = false;
  }
}

// ✅ FIXED SESSION CONFIGURATION
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
};

// Initialize session store and configure middleware
await initializeSessionStore();

// Only use MongoStore if available
if (mongoStoreAvailable && MongoStore && process.env.MONGODB_URI) {
  try {
    // For v6+, the syntax might be different
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: "native",
    });
    console.log("✅ Using MongoStore for session management");
  } catch (storeError) {
    console.error("Failed to create MongoStore:", storeError.message);
    console.warn("⚠️  Falling back to MemoryStore");
    mongoStoreAvailable = false;
  }
} else {
  console.warn("⚠️  Using MemoryStore - NOT RECOMMENDED FOR PRODUCTION!");
  console.warn("⚠️  Railway will send SIGTERM due to memory leaks!");

  // Add memory leak mitigation for MemoryStore
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️  Adding memory cleanup for MemoryStore (temporary fix)");

    // Clean MemoryStore every 30 minutes to reduce leaks
    setInterval(() => {
      if (app.get("sessionStore")) {
        app.get("sessionStore").clear((err) => {
          if (!err) {
            console.log("MemoryStore cleared to reduce memory leak");
          }
        });
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
}

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRoutes);
app.use("/locations", locationRoutes);
app.use("/shops", shopRoutes);
app.use("/gearpicks", gearpicks);
app.use("/routes", routeRoutes);
app.use("/donation", donationRoutes);
app.use("/shop-subscriptions", shopSubscriptionRoutes);
app.use("/admin", adminRoutes);

// ✅ IMPROVED Health check
app.get("/health", (req, res) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessionStore: mongoStoreAvailable ? "MongoStore" : "MemoryStore",
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(
        process.memoryUsage().heapTotal / 1024 / 1024
      )}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
    warning: mongoStoreAvailable
      ? null
      : "MemoryStore in use - may cause SIGTERM",
  };

  res.status(200).json(healthStatus);
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Veloclique API",
    version: "1.0.0",
    health: "/health",
    docs: "https://docs.veloclique.com",
  });
});

export default app;
