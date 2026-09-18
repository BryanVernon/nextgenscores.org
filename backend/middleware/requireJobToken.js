import crypto from "node:crypto";

export function requireJobTokenFor(environmentKey) {
  return function requireJobToken(req, res, next) {
    const expected = process.env[environmentKey];
    const authorization = req.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!expected || !token) return res.status(401).json({ message: "Not authorized" });

    const expectedBuffer = Buffer.from(expected);
    const tokenBuffer = Buffer.from(token);
    if (expectedBuffer.length !== tokenBuffer.length || !crypto.timingSafeEqual(expectedBuffer, tokenBuffer)) {
      return res.status(401).json({ message: "Not authorized" });
    }
    next();
  };
}

export default requireJobTokenFor("REMINDER_JOB_TOKEN");
