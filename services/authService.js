import bcrypt from "bcrypt";
import User from "../models/user.model.js";

export const registerUser = async (name, email, password) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  return user;
};

export const validateUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid password");

  return user;
};

export const findOrCreateOAuthUser = async (provider, profile) => {
  const query = {};
  query[`${provider}Id`] = profile.id;

  let user = await User.findOne(query);
  if (!user) {
    user = await User.create({
      [provider + "Id"]: profile.id,
      name: profile.displayName || profile.name?.givenName || "Unnamed User",
      email: profile.emails?.[0]?.value || undefined,
    });
  }
  return user;
};
