import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import bodyParser from "body-parser";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/LocationRoutes.js";
import shopRoutes from "./routes/ShopRoutes.js";
import connectDB, { getConnectionStatus, getConnectionInfo } from "./config/db.js";

import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";
import gearpicks from "./routes/gearpick.js";
import routeRoutes from "./routes/route.js";
import donationRoutes from "./routes/donationRoutes.js";
import shopSubscriptionRoutes from "./routes/shopSubscription.js";
import contentRoutes from "./routes/contentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userDonationRoutes from "./routes/userDonationRoutes.js";

// Import webhook handlers
import { handleWebhook } from "./controllers/donationController.js";
import { handleShopWebhook } from "./controllers/shopSubscriptionController.js";
import { handleUserDonationWebhook } from "./controllers/userDonationController.js";

// Initialize Express app
const app = express();

// Global state for app readiness
let isAppReady = false;
let sessionStore = null;

// Enable trust proxy for correct protocol detection on Railway/behind proxies
app.set("trust proxy", 1);

// ====================================================
// 1. BASIC MIDDLEWARE (Runs for all routes)
// ====================================================
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

// ====================================================
// 2. WEBHOOK ROUTES (Must come before body parsers)
// ====================================================
app.post(
  "/donation/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body.toString();
    console.log("Webhook middleware: rawBody length =", req.rawBody.length);
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
  handleShopWebhook
);

app.post(
  "/user-donation/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body.toString();
    next();
  },
  handleUserDonationWebhook
);

// ====================================================
// 3. STANDARD MIDDLEWARE (For all other routes)
// ====================================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

// ====================================================
// 4. SESSION STORE CONFIGURATION
// ====================================================
try {
  console.log("Attempting to configure MongoStore...");

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log("MongoDB URI available:", !!mongoUri);

  if (!mongoUri) {
    throw new Error("No MongoDB URI found in environment variables");
  }

  sessionStore = MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: "native",
    crypto: {
      secret: process.env.SESSION_SECRET || "fallback-secret-for-crypto",
    },
    touchAfter: 24 * 3600, // Lazy session update - 24 hours
  });

  console.log("✅ MongoStore configured successfully");

} catch (error) {
  console.error("❌ Failed to configure MongoStore:", error.message);
  console.warn("⚠️  Falling back to MemoryStore");

  sessionStore = new session.MemoryStore();

  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️  Adding MemoryStore cleanup");
    setInterval(() => {
      sessionStore.clear((err) => {
        if (err) console.error("Error clearing MemoryStore:", err);
      });
    }, 5 * 60 * 1000); // 5 minutes
  }
}

// Store reference for health checks
app.set("sessionStore", sessionStore);

// ====================================================
// 5. SESSION CONFIGURATION
// ====================================================
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
  name: "veloclique.sid",
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// ====================================================
// 6. HEALTH & READINESS ENDPOINTS (Must come early)
// ====================================================

// Liveness probe - just checks if process is running
app.get("/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ready: isAppReady
  });
});

// Readiness probe - checks if app can handle requests
app.get("/ready", (req, res) => {
  const dbConnected = getConnectionStatus();
  const dbInfo = getConnectionInfo();

  if (isAppReady) {
    const memoryUsage = process.memoryUsage();
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbConnected ? "connected" : "disconnected",
      databaseInfo: dbInfo,
      sessionStore: sessionStore?.constructor?.name || "unknown",
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      }
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "Application is starting up"
    });
  }
});

// Health check endpoint (for Railway's default health checks)
app.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const dbConnected = getConnectionStatus();
  const dbInfo = getConnectionInfo();

  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ready: isAppReady,
    database: dbConnected ? "connected" : "disconnected",
    databaseInfo: dbInfo,
    sessionStore: sessionStore?.constructor?.name || "unknown",
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    }
  };

  // Always return 200 for health checks - Railway monitors uptime
  res.status(200).json(healthStatus);
});

// ====================================================
// 7. APPLICATION ROUTES
// ====================================================
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRoutes);
app.use("/locations", locationRoutes);
app.use("/shops", shopRoutes);
app.use("/gearpicks", gearpicks);
app.use("/routes", routeRoutes);
app.use("/donation", donationRoutes);
app.use("/shop-subscriptions", shopSubscriptionRoutes);
app.use("/user-donation", userDonationRoutes);
app.use("/content", contentRoutes);
app.use("/admin", adminRoutes);

// ====================================================
// 8. ROOT ENDPOINT & CATCH-ALL
// ====================================================
app.get("/", (req, res) => {
  const dbConnected = getConnectionStatus();

  res.status(200).json({
    message: "Veloclique API",
    version: "1.0.0",
    health: "/health",
    live: "/live",
    ready: "/ready",
    sessionStore: sessionStore?.constructor?.name || "unknown",
    database: dbConnected ? "connected" : "disconnected",
    status: isAppReady ? "ready" : "starting"
  });
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ====================================================
// 9. APPLICATION INITIALIZATION FUNCTION
// ====================================================
async function initializeApp() {
  console.log("🔄 Starting application initialization...");

  try {
    // Connect to database (with timeout)
    console.log("📡 Connecting to MongoDB...");

    const initTimeout = setTimeout(() => {
      console.log("⚠️  Database connection taking longer than expected...");
      console.log("⚠️  Continuing with initialization...");
    }, 8000); // 8 second timeout

    // Try to connect to DB but don't crash if it fails
    try {
      await connectDB();
      clearTimeout(initTimeout);
      console.log("✅ MongoDB connection attempt completed");
    } catch (dbError) {
      console.log("⚠️  MongoDB connection failed, continuing in degraded mode");
      console.log("⚠️  Some features may not work, but API will still run");
    }

    // Mark app as ready (regardless of DB connection)
    isAppReady = true;
    console.log("✅ Application initialization complete");
    console.log("✅ App is ready to accept requests");

    // Log status
    const dbConnected = getConnectionStatus();
    console.log(`📊 Database Status: ${dbConnected ? 'Connected' : 'Not Connected'}`);

    // Log initial memory usage
    const memoryUsage = process.memoryUsage();
    console.log(`🧠 Initial Memory - RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);

  } catch (error) {
    console.error("❌ Initialization error:", error.message);

    // Even if initialization fails, we can still serve some requests
    isAppReady = true;
    console.log("⚠️  Application running in degraded mode");
  }
}

// ====================================================
// 10. MIDDLEWARE TO BLOCK REQUESTS DURING STARTUP
// ====================================================
app.use((req, res, next) => {
  // Allow health checks and webhooks during startup
  const allowedDuringStartup = [
    '/live',
    '/health',
    '/ready',
    '/',
    '/donation/webhook',
    '/shop-subscriptions/webhook',
    '/user-donation/webhook'
  ];

  if (!isAppReady && !allowedDuringStartup.includes(req.path)) {
    res.status(503).json({
      error: "Service Temporarily Unavailable",
      message: "Application is starting up. Please try again in a moment.",
      status: "starting",
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
});

// Start initialization (non-blocking)
setImmediate(() => {
  initializeApp();
});

export default app;


// import dotenv from "dotenv";
// dotenv.config({ quiet: true });

// import express from "express";
// import path from "path";
// import cookieParser from "cookie-parser";
// import logger from "morgan";
// import session from "express-session";
// import cors from "cors";
// import bodyParser from "body-parser";
// import passport from "./config/passport.js";
// import authRoutes from "./routes/authRoutes.js";
// import locationRoutes from "./routes/LocationRoutes.js";
// import shopRoutes from "./routes/ShopRoutes.js";
// import connectDB from "./config/db.js";

// import indexRouter from "./routes/index.js";
// import usersRouter from "./routes/users.js";
// import gearpicks from "./routes/gearpick.js";
// import routeRoutes from "./routes/route.js";
// import donationRoutes from "./routes/donationRoutes.js";
// import shopSubscriptionRoutes from "./routes/shopSubscription.js";
// import contentRoutes from "./routes/contentRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
// import userDonationRoutes from "./routes/userDonationRoutes.js";

// // Import webhook handlers
// import { handleWebhook } from "./controllers/donationController.js";
// import { handleShopWebhook } from "./controllers/shopSubscriptionController.js";
// import { handleUserDonationWebhook } from "./controllers/userDonationController.js";


// // Initialize Express app
// const app = express();


// // Connect to MongoDB
// connectDB();

// // Basic middleware that runs for all routes
// app.use(logger("dev"));
// app.use(
//   cors({
//     origin: process.env.CLIENT_ORIGIN?.split(",") || [
//       "http://localhost:5173",
//       "https://www.veloclique.com",
//       "https://veloclique.com",
//     ],
//     credentials: true,
//   })
// );

// // --- WEBHOOK ROUTE with raw body parser ---
// app.post(
//   "/donation/webhook",
//   // Use body-parser.raw() middleware for this specific route only
//   bodyParser.raw({ type: "application/json" }),
//   (req, res, next) => {
//     // Store the raw body in req.rawBody for Stripe verification
//     req.rawBody = req.body.toString();
//     console.log("Webhook middleware: rawBody length =", req.rawBody.length);
//     console.log(
//       "Webhook middleware: First 100 chars =",
//       req.rawBody.substring(0, 100)
//     );
//     next();
//   },
//   handleWebhook
// );

// app.post(
//   "/shop-subscriptions/webhook",
//   bodyParser.raw({ type: "application/json" }),
//   (req, res, next) => {
//     req.rawBody = req.body.toString();
//     next();
//   },
//   handleShopWebhook // New shop subscription webhook handler
// );

// app.post(
//   "/user-donation/webhook",
//   bodyParser.raw({ type: "application/json" }),
//   (req, res, next) => {
//     req.rawBody = req.body.toString();
//     next();
//   },
//   handleUserDonationWebhook
// );

// // --- AFTER webhook route, add JSON parser for all other routes ---
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(process.cwd(), "public")));

// // ✅ FIXED: Session Store Configuration
// let sessionStore;

// try {
//   // Try to create MongoStore with proper error handling
//   console.log("Attempting to configure MongoStore...");
//   console.log("MONGODB_URI available:", !!process.env.MONGO_URI);

//   // For connect-mongo v6+
//   const { MongoStore } = await import("connect-mongo");

//   sessionStore = MongoStore.create({
//     mongoUrl: process.env.MONGO_URI,
//     collectionName: "sessions",
//     ttl: 14 * 24 * 60 * 60, // 14 days
//     autoRemove: "native",
//     crypto: {
//       secret: process.env.SESSION_SECRET || "fallback-secret-for-crypto",
//     },
//   });

//   console.log("✅ MongoStore configured successfully");

//   // Test the connection
//   sessionStore.client
//     .then((client) => {
//       console.log("✅ MongoStore connected to MongoDB");
//     })
//     .catch((err) => {
//       console.error("❌ MongoStore connection error:", err.message);
//       throw err; // Re-throw to trigger fallback
//     });
// } catch (error) {
//   console.error("❌ Failed to configure MongoStore:", error.message);
//   console.warn(
//     "⚠️  Falling back to MemoryStore - THIS WILL CAUSE MEMORY LEAKS IN PRODUCTION"
//   );

//   // MemoryStore as fallback
//   sessionStore = new session.MemoryStore();

//   // Aggressive memory leak mitigation for Railway
//   if (process.env.NODE_ENV === "production") {
//     console.warn("⚠️  Adding aggressive MemoryStore cleanup for Railway");

//     // Clear MemoryStore every 15 minutes
//     setInterval(() => {
//       console.log("🔄 Clearing MemoryStore to prevent memory leak");
//       sessionStore.clear((err) => {
//         if (err) {
//           console.error("Error clearing MemoryStore:", err);
//         } else {
//           console.log("✅ MemoryStore cleared successfully");
//         }
//       });
//     }, 15 * 60 * 1000); // Every 15 minutes

//     // Also clear on every 1000th request to keep memory usage low
//     let requestCount = 0;
//     app.use((req, res, next) => {
//       requestCount++;
//       if (requestCount >= 1000) {
//         sessionStore.clear(() => { });
//         requestCount = 0;
//         console.log("🔄 MemoryStore cleared after 1000 requests");
//       }
//       next();
//     });
//   }
// }

// // ✅ Session Configuration
// const sessionConfig = {
//   secret: process.env.SESSION_SECRET || "secret123",
//   resave: false,
//   saveUninitialized: false,
//   store: sessionStore,
//   cookie: {
//     secure: process.env.NODE_ENV === "production",
//     httpOnly: true,
//     maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
//     sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//   },
//   name: "veloclique.sid", // Explicit session cookie name
// };

// // Apply session middleware
// app.use(session(sessionConfig));

// // Store reference to session store for health checks
// app.set("sessionStore", sessionStore);

// app.use(passport.initialize());
// app.use(passport.session());

// // Routes
// app.use("/", indexRouter);
// app.use("/users", usersRouter);
// app.use("/auth", authRoutes);
// app.use("/locations", locationRoutes);
// app.use("/shops", shopRoutes);
// app.use("/gearpicks", gearpicks);
// app.use("/routes", routeRoutes);
// app.use("/donation", donationRoutes);
// app.use("/shop-subscriptions", shopSubscriptionRoutes);
// app.use("/user-donation", userDonationRoutes);
// app.use("/content", contentRoutes);
// app.use("/admin", adminRoutes);

// // ✅ IMPROVED Health check with memory monitoring
// app.get("/health", (req, res) => {
//   const memoryUsage = process.memoryUsage();
//   const usedMB = memoryUsage.heapUsed / 1024 / 1024;
//   const totalMB = memoryUsage.heapTotal / 1024 / 1024;

//   const healthStatus = {
//     status: usedMB > 800 ? "warning" : "healthy", // Warning if > 800MB
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     sessionStore: sessionStore.constructor.name,
//     memory: {
//       rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
//       heapTotal: `${Math.round(totalMB)}MB`,
//       heapUsed: `${Math.round(usedMB)}MB`,
//       external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
//     },
//     warnings:
//       sessionStore.constructor.name === "MemoryStore"
//         ? ["MemoryStore in use - may cause SIGTERM on Railway"]
//         : [],
//     mongoConnected: sessionStore.constructor.name !== "MemoryStore",
//   };

//   res.status(200).json(healthStatus);
// });

// // Simple memory monitoring middleware
// app.use((req, res, next) => {
//   const memoryUsage = process.memoryUsage();
//   const usedMB = memoryUsage.heapUsed / 1024 / 1024;

//   // Log warning if memory usage is high
//   if (usedMB > 700) {
//     console.warn(`⚠️  High memory usage detected: ${Math.round(usedMB)}MB`);
//   }

//   next();
// });

// app.get("/", (req, res) => {
//   res.status(200).json({
//     message: "Veloclique API",
//     version: "1.0.0",
//     health: "/health",
//     docs: "https://docs.veloclique.com",
//     sessionStore: sessionStore.constructor.name,
//     memory: `${Math.round(
//       process.memoryUsage().heapUsed / 1024 / 1024
//     )}MB used`,
//   });
// });

// // Global error handler for memory issues
// process.on("warning", (warning) => {
//   console.warn("Node.js Warning:", warning.name);
//   console.warn("Message:", warning.message);
//   console.warn("Stack:", warning.stack);

//   if (warning.name === "MaxListenersExceededWarning") {
//     console.error("⚠️  MaxListenersExceeded - Possible memory leak!");
//   }
// });

// export default app;
