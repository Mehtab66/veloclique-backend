import passport from "passport";
import { 
  registerUser, 
  sendSignupOTP, 
  verifySignupOTP, 
  loginUser,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword
} from "../services/authService.js";
import { authenticate, generateToken } from "../middleware/authMiddleware.js";

// Send OTP for signup
export const sendOTP = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await sendSignupOTP(email, password, name);
    res.json(result);
  } catch (err) {
    const errorMessage = err.message || "Failed to send OTP";
    res.status(400).json({ error: errorMessage });
  }
};

// Verify OTP and create account
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }
    const { user, token } = await verifySignupOTP(email, otp);
    res.json({ message: "Account created successfully", user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await registerUser(name, email, password);
    res.json({ message: "User registered", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login with email and password - returns JWT token
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const { user, token } = await loginUser(email, password);
    res.json({ message: "Login successful", user, token });
  } catch (err) {
    res.status(400).json({ error: err.message || "Login failed" });
  }
};

export const googleAuth = async (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables." 
    });
  }
  
  // Try to initialize strategy if not already registered
  const { initializeGoogleStrategy } = await import("../config/passport.js");
  const isInitialized = initializeGoogleStrategy();
  
  if (!isInitialized) {
    return res.status(503).json({ 
      error: "Google OAuth strategy failed to initialize. Please check your environment variables and restart the server." 
    });
  }
  
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    session: false // We use JWT, not sessions
  })(req, res, next);
};

export const googleCallback = async (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables." 
    });
  }
  
  // Try to initialize strategy if not already registered
  const { initializeGoogleStrategy } = await import("../config/passport.js");
  const isInitialized = initializeGoogleStrategy();
  
  if (!isInitialized) {
    return res.status(503).json({ 
      error: "Google OAuth strategy failed to initialize. Please check your environment variables and restart the server." 
    });
  }
  
  passport.authenticate("google", {
    failureRedirect: "/auth/failure",
    session: false, // We use JWT, not sessions
  })(req, res, next);
};

export const facebookAuth = passport.authenticate("facebook", { scope: ["email"] });
export const facebookCallback = passport.authenticate("facebook", {
  failureRedirect: "/auth/failure",
  session: true,
});

export const appleAuth = passport.authenticate("apple");
export const appleCallback = passport.authenticate("apple", {
  failureRedirect: "/auth/failure",
  session: true,
});

export const failure = (req, res) => res.status(401).json({ message: "Authentication failed" });

// OAuth success handler - generates JWT token for OAuth users and redirects to frontend
export const success = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173"}/login?error=authentication_failed`);
    }
    
    const token = generateToken(req.user);
    
    // Redirect to frontend with token
    const clientOrigin = process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173";
    res.redirect(`${clientOrigin}/auth/callback?token=${token}&provider=google`);
  } catch (error) {
    const clientOrigin = process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173";
    res.redirect(`${clientOrigin}/login?error=${encodeURIComponent(error.message)}`);
  }
};

// Get current user from token
export const getMe = async (req, res) => {
  try {
    // User is attached by authenticate middleware
    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    delete userObj.password;
    res.json({ user: userObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send password reset OTP
export const sendForgotPasswordOTP = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const result = await sendPasswordResetOTP(email);
    res.json(result);
  } catch (err) {
    // Always return success message for security (don't reveal if user exists)
    res.json({ message: "If an account exists with this email, a reset code will be sent", email });
  }
};

// Verify password reset OTP
export const verifyForgotPasswordOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }
    const result = await verifyPasswordResetOTP(email, otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Reset password with new password
export const resetPasswordController = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }
    const result = await resetPassword(email, otp, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Logout - client-side token removal (JWT is stateless)
export const logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

