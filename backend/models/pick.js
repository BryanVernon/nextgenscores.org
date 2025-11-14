import mongoose from "mongoose";


// --- Define Pick'em Schema ---
const pickSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  gameId: Number,
  pick: String, // "home" or "away"
  week: Number,
  season: Number,
  spread: Number,
  createdAt: { type: Date, default: Date.now }
});

const Pick = mongoose.model("pick", pickSchema);

