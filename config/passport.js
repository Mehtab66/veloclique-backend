// import passport from "passport";
// import { Strategy as LocalStrategy } from "passport-local";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import { Strategy as FacebookStrategy } from "passport-facebook";
// import AppleStrategy from "passport-apple";
// import {
//   registerUser,
//   validateUser,
//   findOrCreateOAuthUser,
// } from "../services/authService.js";
// import User from "../models/user.model.js";

// // Local (Email & Password)
// passport.use(
//   new LocalStrategy(
//     { usernameField: "email" },
//     async (email, password, done) => {
//       try {
//         const user = await validateUser(email, password);
//         return done(null, user);
//       } catch (err) {
//         return done(null, false, { message: err.message });
//       }
//     }
//   )
// );

// // Google
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: process.env.GOOGLE_CALLBACK_URL,
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         const user = await findOrCreateOAuthUser("google", profile);
//         done(null, user);
//       } catch (err) {
//         done(err);
//       }
//     }
//   )
// );

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

// // Serialize user
// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//   const user = await User.findById(id);
//   done(null, user);
// });

// export default passport;
