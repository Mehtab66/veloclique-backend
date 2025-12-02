import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // Default 7 days

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with _id and email
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
};

/**
 * Middleware to authenticate requests using JWT
 * Attaches user to req.user if token is valid
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || "Invalid token" });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that work with or without authentication
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select("-password");
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

