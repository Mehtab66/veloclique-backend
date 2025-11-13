import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/db.js";

import indexRouter from "./routes/index.js";
import usersRouter from "./routes/users.js";

// --- Initialize Express app FIRST ---
const app = express();

// --- Connect to MongoDB ---
connectDB();

// --- Middleware setup ---
app.use(logger("dev"));
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
app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRoutes);

// --- Error handling or export ---
export default app;
