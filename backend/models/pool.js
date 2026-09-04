import mongoose from "mongoose";

const poolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  scoringType: { type: String, enum: ["straight", "spread"], required: true },
  gameSelection: { type: String, enum: ["all", "competitive-ten"], default: "all" },
  conference: { type: String, default: "All" },
  limit: { type: Number, default: 10 },
  visibility: { type: String, enum: ["public", "private"], default: "public" },
  joinPasswordHash: { type: String, select: false },
  inviteCode: { type: String, select: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  startSeason: Number,
  startWeek: Number,
  memberStarts: { type: Map, of: new mongoose.Schema({ season: Number, week: Number }, { _id: false }), default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("pool", poolSchema);
