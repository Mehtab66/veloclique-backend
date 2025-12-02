import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
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
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/auth/google/callback",
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const user = await findOrCreateOAuthUser("google", profile);
              done(null, user);
            } catch (err) {
              done(err, null);
            }
          }
        )
      );
      console.log("✅ Google OAuth strategy initialized");
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

// Initialize Google strategy on module load
initializeGoogleStrategy();

// Export function to re-initialize if needed
export { initializeGoogleStrategy };

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
// passport.use(
//   new FacebookStrategy(
//     {
//       clientID: process.env.FB_CLIENT_ID,
//       clientSecret: process.env.FB_CLIENT_SECRET,
//       callbackURL: process.env.FB_CALLBACK_URL,
//       profileFields: ["id", "displayName", "emails"],
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         const user = await findOrCreateOAuthUser("facebook", profile);
//         done(null, user);
//       } catch (err) {
//         done(err);
//       }
//     }
//   )
// );

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
