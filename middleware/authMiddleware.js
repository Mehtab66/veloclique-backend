import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

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
  console.log("jwt secret:", JWT_SECRET);
  return jwt.sign(payload, JWT_SECRET);
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
      return res.status(401).json({
        success: false,
        error: "No token provided. Please log in.",
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found. Please log in again.",
      });
    }

    // Check if account is marked for deletion
    if (user.markedForDeletion) {
      return res.status(401).json({
        success: false,
        error: "Account is scheduled for deletion. Please contact support.",
      });
    }

    // Verify token is in active sessions (if sessions are enabled)
    if (user.sessions && user.sessions.length > 0) {
      const sessionExists = user.sessions.some(
        (session) => session.token === token
      );
      if (!sessionExists) {
        return res.status(401).json({
          success: false,
          error: "Session expired. Please log in again.",
        });
      }

      // Update session last active time
      const session = user.sessions.find((s) => s.token === token);
      if (session) {
        session.lastActive = new Date();
        await user.save();
      }
    }

    // Remove sensitive data from user object
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.twoFactorSecret;
    delete userObj.emailChangeOTP;
    delete userObj.emailChangeOTPExpires;
    delete userObj.sessions;
    delete userObj.dataExport;

    req.user = userObj;
    req.token = token; // Attach token for session management
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please log in again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired. Please log in again.",
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed. Please try again.",
    });
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
      const user = await User.findById(decoded.id);
      if (user && !user.markedForDeletion) {
        // Remove sensitive data
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.twoFactorSecret;
        delete userObj.emailChangeOTP;
        delete userObj.emailChangeOTPExpires;
        delete userObj.sessions;
        delete userObj.dataExport;

        req.user = userObj;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Middleware to authorize admin users only
 * Must be used after authenticate middleware
 */
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }

  next();
};
