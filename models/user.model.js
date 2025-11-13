import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  password: String,
  googleId: String,
  facebookId: String,
  appleId: String,
});

export default mongoose.model("User", userSchema);
