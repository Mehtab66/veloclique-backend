import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import cors from "cors";
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

// --- Import webhook handler ---
import { handleWebhook } from "./controllers/donationController.js";

// --- Initialize Express app ---
const app = express();

// --- Connect to MongoDB ---
connectDB();

// --- Middleware setup ---
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

// --- CRITICAL: Webhook route MUST come BEFORE json/urlencoded middleware ---
app.post(
  "/donation/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// --- Body parsing middleware for ALL OTHER routes ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- ALL other routes go here ---
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

// --- Donation routes (EXCEPT webhook which is now handled above) ---
app.use("/donation", donationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
