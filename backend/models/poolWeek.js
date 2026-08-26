import mongoose from "mongoose";

const poolWeekSchema = new mongoose.Schema({
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: "pool", required: true },
  season: { type: Number, required: true },
  week: { type: Number, required: true },
  gameIds: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now },
});

poolWeekSchema.index({ poolId: 1, season: 1, week: 1 }, { unique: true });

export default mongoose.model("poolWeek", poolWeekSchema);
