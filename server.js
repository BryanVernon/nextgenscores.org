import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
const uri = process.env.MONGODB_URI;
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Simple schema for now
const GameSchema = new mongoose.Schema({
  homeTeam: String,
  awayTeam: String,
  spread: String,
  date: String,
});
const Game = mongoose.model("Game", GameSchema);

// Basic route
app.get("/", (req, res) => {
  res.send("NextGenScores API is live!");
});

// Placeholder to list games
app.get("/api/games", async (req, res) => {
  const games = await Game.find();
  res.json(games);
});

// Temporary route to add a test game
app.post("/api/games", async (req, res) => {
  const newGame = new Game(req.body);
  await newGame.save();
  res.json(newGame);
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
