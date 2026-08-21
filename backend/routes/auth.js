// backend/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
const router = express.Router();

// helpers
function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sendTokenCookie(res, token) {
  const cookieName = process.env.COOKIE_NAME || "ngs_token";
  const isProd = process.env.NODE_ENV === "production";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}



// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, favoriteTeams } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const user = await User.createWithPassword({ name, email, password, favoriteTeams });
    const token = signToken(user._id);
    sendTokenCookie(res, token);

    // return user object (omit passwordHash)
    const safeUser = { id: user._id, name: user.name, email: user.email, favoriteTeams: user.favoriteTeams };
    res.status(201).json({ user: safeUser });
  } catch (err) {
    console.error("Signup error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    const safeUser = { id: user._id, name: user.name, email: user.email, favoriteTeams: user.favoriteTeams };
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const cookieName = process.env.COOKIE_NAME || "ngs_token";
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SECURE === "true" ? "none" : "lax",
  });
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    // read token from cookie
    const cookieName = process.env.COOKIE_NAME || "ngs_token";
    const token = req.cookies?.[cookieName] || null;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const safeUser = { id: user._id, name: user.name, email: user.email, favoriteTeams: user.favoriteTeams };
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Me error", err);
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.put("/favorite-teams", async (req, res) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "ngs_token";
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { favoriteTeams } = req.body;
    if (!Array.isArray(favoriteTeams)) {
      return res.status(400).json({ message: "favoriteTeams must be an array" });
    }

    const user = await User.findByIdAndUpdate(
      payload.sub,
      { favoriteTeams },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: { id: user._id, name: user.name, email: user.email, favoriteTeams: user.favoriteTeams } });
  } catch (err) {
    console.error("Update favorite teams error", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
