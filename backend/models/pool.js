import mongoose from "mongoose";

const poolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  scoringType: { type: String, enum: ["straight", "spread"], required: true },
  conference: { type: String, default: "All" },
  limit: { type: Number, default: null },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("pool", poolSchema);
