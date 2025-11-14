import express from "express";
import Game from "../models/game.js"; // your game model
import { sendEmail } from "../utils/mailer.js";

const router = express.Router();

router.post("/send-sec-schedule", async (req, res) => {
  try {
    // Get SEC games only
    const secGames = await Game.find({
      $or: [{ homeConference: "SEC" }, { awayConference: "SEC" }],
    }).sort({ week: 1 });

    if (!secGames.length) {
      return res.status(404).json({ error: "No SEC games found" });
    }

    // Build HTML table
    let html = `<h2>SEC Game Schedule</h2><table border="1" cellpadding="5" cellspacing="0">
      <tr><th>Week</th><th>Date</th><th>Away Team</th><th>Home Team</th><th>Spread</th><th>Over/Under</th></tr>`;

    secGames.forEach((g) => {
      html += `<tr>
        <td>${g.week}</td>
        <td>${new Date(g.startDate).toLocaleDateString()}</td>
        <td>${g.awayTeam}</td>
        <td>${g.homeTeam}</td>
        <td>${g.spread ?? "N/A"}</td>
        <td>${g.overUnder ?? "N/A"}</td>
      </tr>`;
    });
    html += "</table>";

    await sendEmail({
      to: process.env.SEND_TO_EMAIL,
      subject: "Weekly SEC Schedule",
      html,
    });

    res.json({ message: "SEC schedule email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send SEC schedule", details: err.message });
  }
});

export default router;
