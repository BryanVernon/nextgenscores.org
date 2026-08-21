import jwt from "jsonwebtoken";

export default function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "ngs_token";
    const authorization = req.get("authorization");
    const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    const token = req.cookies?.[cookieName] || bearerToken;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    res.status(401).json({ message: "Not authenticated" });
  }
}
