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
  const secure = process.env.COOKIE_SECURE === "true";
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",   // 'lax' works for localhost; use 'none' + secure for production
    maxAge: (() => {
      // parse duration like '7d' to ms, fallback to 7 days
      const v = process.env.JWT_EXPIRES_IN || "7d";
      if (v.endsWith("d")) return parseInt(v) * 24 * 60 * 60 * 1000;
      return 7 * 24 * 60 * 60 * 1000;
    })(),
  });
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, favoriteTeam } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const user = await User.createWithPassword({ name, email, password, favoriteTeam });
    const token = signToken(user._id);
    sendTokenCookie(res, token);

    // return user object (omit passwordHash)
    const safeUser = { id: user._id, name: user.name, email: user.email, favoriteTeam: user.favoriteTeam };
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

    const safeUser = { id: user._id, name: user.name, email: user.email, favoriteTeam: user.favoriteTeam };
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

    const safeUser = { id: user._id, name: user.name, email: user.email, favoriteTeam: user.favoriteTeam };
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Me error", err);
    res.status(401).json({ message: "Not authenticated" });
  }
});

export default router;
