// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  favoriteTeams: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.statics.createWithPassword = async function ({ name, email, password, favoriteTeams }) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return this.create({ name, email, passwordHash: hash, favoriteTeams: favoriteTeams || [] });
};

export default mongoose.model("User", UserSchema);
