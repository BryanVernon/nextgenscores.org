// backend/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { isConfiguredAdmin } from "../utils/admin.js";
import requireAuth from "../middleware/requireAuth.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";
const router = express.Router();

async function syncConfiguredAdmin(user) {
  if (isConfiguredAdmin(user.email) && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
  return user;
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    favoriteTeams: user.favoriteTeams,
    theme: user.theme || { mode: "default", team: null },
  };
}

// helpers
function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function getCookieOptions(req) {
  const cookieName = process.env.COOKIE_NAME || "ngs_token";
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isSecure = process.env.COOKIE_SECURE === "true"
    || forwardedProtocol === "https"
    || req.protocol === "https";

  return {
    cookieName,
    options: {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };
}

function sendTokenCookie(req, res, token) {
  const { cookieName, options } = getCookieOptions(req);
  res.cookie(cookieName, token, options);
}



// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, favoriteTeams } = req.body;
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || name;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const user = await syncConfiguredAdmin(await User.createWithPassword({ name: fullName, firstName, lastName, email, password, favoriteTeams }));
    const token = signToken(user._id);
    sendTokenCookie(req, res, token);

    // return user object (omit passwordHash)
    res.status(201).json({ user: safeUser(user), token });
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

    await syncConfiguredAdmin(user);
    const token = signToken(user._id);
    sendTokenCookie(req, res, token);

    res.json({ user: safeUser(user), token });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Return the same success message whether or not the email exists so this
// endpoint cannot reveal which addresses have accounts.
router.post("/forgot-password", async (req, res) => {
  const successMessage = "If an account uses that email address, a reset link has been sent.";

  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.json({ message: successMessage });

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const appUrl = (process.env.FRONTEND_URL || "https://nextgenscores.org").replace(/\/$/, "");
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl: `${appUrl}/reset-password?token=${encodeURIComponent(token)}`,
    });

    res.json({ message: successMessage });
  } catch (err) {
    console.error("Forgot password error", err);
    res.status(500).json({ message: "Unable to send a password reset email. Please try again later." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Your new password must be at least 8 characters" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired" });
    }

    await user.setPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    console.error("Reset password error", err);
    res.status(500).json({ message: "Unable to reset password. Please try again later." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const { cookieName, options } = getCookieOptions(req);
  res.clearCookie(cookieName, options);
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    await syncConfiguredAdmin(user);

    res.json({ user: safeUser(user) });
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

    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error("Update favorite teams error", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/preferences", requireAuth, async (req, res) => {
  try {
    const { favoriteTeams, theme } = req.body;
    const mode = theme?.mode;
    const team = theme?.team || null;

    if (!Array.isArray(favoriteTeams)) {
      return res.status(400).json({ message: "favoriteTeams must be an array" });
    }
    if (!["default", "team"].includes(mode)) {
      return res.status(400).json({ message: "theme mode must be default or team" });
    }
    if (mode === "team" && (!team || !favoriteTeams.includes(team))) {
      return res.status(400).json({ message: "Choose one of your favorite teams for the team theme" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { favoriteTeams, theme: { mode, team: mode === "team" ? team : null } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error("Update preferences error", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
