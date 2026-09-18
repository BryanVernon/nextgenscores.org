export function isConfiguredAdmin(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(String(email || "").trim().toLowerCase());
}

// Only a trusted server-side maintenance command calls this. Public auth
// routes must never promote an account based on a self-reported email address.
export async function promoteConfiguredAdmin(User, email) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalized || !isConfiguredAdmin(normalized)) {
    throw new Error("Specify an existing account whose email is included in ADMIN_EMAILS");
  }
  const user = await User.findOneAndUpdate({ email: normalized }, { $set: { role: "admin" } }, { new: true }).select("email role");
  if (!user) throw new Error("No account exists for that email. Create and verify the intended account first.");
  return user;
}
