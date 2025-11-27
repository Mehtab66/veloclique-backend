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

// --- Initialize Express app FIRST ---
const app = express();

// --- Connect to MongoDB ---
connectDB();

// --- Middleware setup ---
app.use(logger("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

// --- Session Setup (important: before passport middleware) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
  })
);

// --- Initialize Passport ---
// app.use(passport.initialize());
// app.use(passport.session());

// --- Routes ---
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRoutes);
app.use("/locations", locationRoutes);
app.use("/shops", shopRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- Error handling or export ---
export default app;
