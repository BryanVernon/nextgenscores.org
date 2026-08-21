import User from "../models/User.js";

export default async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("role");
    if (user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  } catch (error) {
    next(error);
  }
}
