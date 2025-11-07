import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  gameId: { type: Number, required: true, unique: true },
  homeTeam: String,
  awayTeam: String,
  homeScore: Number,
  awayScore: Number,
  week: Number,
  year: Number,
});

const Game = mongoose.model("Game", gameSchema);
export default Game;
