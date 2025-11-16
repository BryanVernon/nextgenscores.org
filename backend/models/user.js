// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  favoriteTeam: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// instance method to compare password
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// static helper to create a user with hashed password
UserSchema.statics.createWithPassword = async function ({ name, email, password, favoriteTeam }) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return this.create({ name, email, passwordHash: hash, favoriteTeam });
};

export default mongoose.model("User", UserSchema);
