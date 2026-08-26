import mongoose from "mongoose";

const poolNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["pick-reminder", "leaderboard"], required: true },
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: "pool", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  season: { type: Number, required: true },
  week: { type: Number, required: true },
  sentAt: { type: Date, default: Date.now },
});

poolNotificationSchema.index({ type: 1, poolId: 1, userId: 1, season: 1, week: 1 }, { unique: true });

export default mongoose.model("poolNotification", poolNotificationSchema);
