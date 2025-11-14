import express from "express";
import Subscriber from "../models/subscriber.js";

const router = express.Router();

router.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already subscribed" });
    }

    await Subscriber.create({ email });

    res.json({ success: true, message: "Subscribed successfully" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
