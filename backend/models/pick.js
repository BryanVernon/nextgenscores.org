import mongoose from "mongoose";


// --- Define Pick'em Schema ---
const pickSchema = new mongoose.Schema({
  poolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "pool",
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  gameId: {
    type: Number,
    required: true,
  },

  pick: {
    type: String,
    enum: ["home", "away"],
    required: true,
  },

  week: {
    type: Number,
    required: true,
  },

  season: {
    type: Number,
    required: true,
  },

  spread: Number,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

pickSchema.index(
  { poolId: 1, userId: 1, gameId: 1 },
  { unique: true }
);

const Pick = mongoose.model("pick", pickSchema);

export default Pick;

