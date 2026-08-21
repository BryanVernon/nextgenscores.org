export function isConfiguredAdmin(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(String(email || "").trim().toLowerCase());
}
