import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { findOrCreateOAuthUser } from "../services/authService.js";

// Function to initialize Google OAuth strategy
const initializeGoogleStrategy = () => {
  // Check if already registered
  if (passport._strategies && passport._strategies.google) {
    return true;
  }

  // Check if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      passport.use(
        "google",
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: (
              process.env.GOOGLE_CALLBACK_URL ||
              "https://veloclique-backend-empu.onrender.com/auth/google/callback"
            ).trim(),
            proxy: true,
          },
          async (accessToken, refreshToken, profile, done) => {
            console.log("🔍 Google OAuth Callback Strategy Executed");
            try {
              const user = await findOrCreateOAuthUser("google", profile);
              done(null, user);
            } catch (err) {
              done(err, null);
            }
          }
        )
      );
      console.log("✅ Google OAuth strategy initialized with callback:", (process.env.GOOGLE_CALLBACK_URL || "https://veloclique.com/auth/google/callback").trim());
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Google OAuth strategy:", error.message);
      return false;
    }
  } else {
    console.warn("⚠️  Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required");
    return false;
  }
};

// Function to initialize Facebook OAuth strategy
const initializeFacebookStrategy = () => {
  if (passport._strategies && passport._strategies.facebook) {
    return true;
  }

  if (process.env.FB_CLIENT_ID && process.env.FB_CLIENT_SECRET) {
    // Debug log (temporary)
    const appId = process.env.FB_CLIENT_ID;
    console.log(`🔍 FB_CLIENT_ID found. Length: ${appId.length}, Starts with: ${appId.substring(0, 3)}..., Ends with: ...${appId.substring(appId.length - 3)}`);

    try {
      passport.use(
        "facebook",
        new FacebookStrategy(
          {
            clientID: process.env.FB_CLIENT_ID,
            clientSecret: process.env.FB_CLIENT_SECRET,
            callbackURL:
              process.env.FB_CALLBACK_URL ||
              "https://veloclique.com/auth/facebook/callback",
            profileFields: ["id", "displayName", "emails", "name"],
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const user = await findOrCreateOAuthUser("facebook", profile);
              done(null, user);
            } catch (err) {
              done(err, null);
            }
          }
        )
      );
      console.log("✅ Facebook OAuth strategy initialized");
      return true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize Facebook OAuth strategy:",
        error.message
      );
      return false;
    }
  } else {
    console.warn(
      "⚠️  Facebook OAuth not configured - FB_CLIENT_ID and FB_CLIENT_SECRET required"
    );
    return false;
  }
};

// Initialize strategies on module load
initializeGoogleStrategy();
initializeFacebookStrategy();

// Export functions to re-initialize if needed
export { initializeGoogleStrategy, initializeFacebookStrategy };

// Serialize user for session (minimal - we use JWT)
passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// // Facebook
// Strategies are now initialized via initializeFacebookStrategy()
// to allow for dynamic configuration and better error handling.

// // Apple
// passport.use(
//   new AppleStrategy(
//     {
//       clientID: process.env.APPLE_CLIENT_ID,
//       teamID: process.env.APPLE_TEAM_ID,
//       callbackURL: process.env.APPLE_CALLBACK_URL,
//       keyID: process.env.APPLE_KEY_ID,
//       privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//     },
//     async (accessToken, refreshToken, idToken, profile, done) => {
//       try {
//         const user = await findOrCreateOAuthUser("apple", profile);
//         done(null, user);
//       } catch (err) {
//         done(err);
//       }
//     }
//   )
// );

export default passport;
