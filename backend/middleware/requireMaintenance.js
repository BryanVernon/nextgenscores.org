import requireAuth from "./requireAuth.js";
import requireAdmin from "./requireAdmin.js";

// A JSON-only POST cannot be triggered by an image, link prefetch, or a
// cross-origin HTML form using an administrator's session cookie.
function requireJson(req, res, next) {
  if (!req.is("application/json")) return res.status(415).json({ message: "Send maintenance requests as application/json" });
  next();
}

export default [requireAuth, requireAdmin, requireJson];
