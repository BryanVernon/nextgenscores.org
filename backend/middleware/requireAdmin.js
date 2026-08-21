import User from "../models/User.js";
import { isConfiguredAdmin } from "../utils/admin.js";

export default async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    if (isConfiguredAdmin(user.email) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }
    if (user.role !== "admin") return res.status(403).json({ message: "Administrator access required" });

    req.user = user;
    next();
  } catch (err) {
    console.error("Admin authorization error", err);
    res.status(500).json({ message: "Unable to verify administrator access" });
  }
}
