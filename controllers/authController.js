import passport from "passport";
import { registerUser } from "../services/authService.js";

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