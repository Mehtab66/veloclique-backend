import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import MongoStore from "connect-mongo";

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
import userDonationRoutes from "./routes/userDonationRoutes.js";

import { handleWebhook } from "./controllers/donationController.js";
import { handleShopWebhook } from "./controllers/shopSubscriptionController.js";
import { handleUserDonationWebhook } from "./controllers/userDonationController.js";

const app = express();

// Connect DB
await connectDB();

// Middleware
app.use(logger("dev"));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(",") || [
    "http://localhost:5173",
    "https://veloclique.com",
    "https://www.veloclique.com",
  ],
  credentials: true,
}));

// Webhooks (raw body)
app.post("/donation/webhook", bodyParser.raw({ type: "application/json" }), (req, _, next) => {
  req.rawBody = req.body.toString();
  next();
}, handleWebhook);

app.post("/shop-subscriptions/webhook", bodyParser.raw({ type: "application/json" }), (req, _, next) => {
  req.rawBody = req.body.toString();
  next();
}, handleShopWebhook);

app.post("/user-donation/webhook", bodyParser.raw({ type: "application/json" }), (req, _, next) => {
  req.rawBody = req.body.toString();
  next();
}, handleUserDonationWebhook);

// Normal parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

// ================= SESSION =================

let sessionStore;

try {
  console.log("Attempting to configure MongoStore...");
  console.log("MONGO_URI available:", !!process.env.MONGO_URI);

  sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60,
    autoRemove: "native",
    crypto: { secret: process.env.SESSION_SECRET },
  });

  console.log("✅ MongoStore configured");
} catch (err) {
  console.error("❌ Session store init failed:", err);
  process.exit(1);
}

app.use(session({
  name: "veloclique.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ================= ROUTES =================

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

// Health
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ================= START =================

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
