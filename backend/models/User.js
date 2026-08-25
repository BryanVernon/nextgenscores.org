// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  favoriteTeams: { type: [String], default: [] },
  theme: {
    mode: { type: String, enum: ["default", "team"], default: "default" },
    team: { type: String, default: null },
  },
  passwordResetTokenHash: { type: String, default: null, select: false },
  passwordResetExpiresAt: { type: Date, default: null, select: false },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

UserSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

UserSchema.statics.createWithPassword = async function ({ name, firstName, lastName, email, password, favoriteTeams }) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return this.create({ name, firstName, lastName, email, passwordHash: hash, favoriteTeams: favoriteTeams || [] });
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
