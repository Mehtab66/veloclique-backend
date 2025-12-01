import passport from "passport";
import { registerUser, sendSignupOTP, verifySignupOTP } from "../services/authService.js";

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
    const user = await verifySignupOTP(email, otp);
    res.json({ message: "Account created successfully", user });
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

export const login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: info?.message });
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Login successful", user });
    });
  })(req, res, next);
};

export const googleAuth = passport.authenticate("google", { scope: ["profile", "email"] });
export const googleCallback = passport.authenticate("google", {
  failureRedirect: "/auth/failure",
  session: true,
});

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
export const success = (req, res) => res.json({ message: "Authenticated", user: req.user });
export const logout = (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
};

