import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { isConfiguredAdmin, promoteConfiguredAdmin } from "../utils/admin.js";

dotenv.config();

async function run() {
  const email = process.argv[2];
  if (!email || !isConfiguredAdmin(email)) {
    throw new Error("Usage: npm run admin:promote -- account@example.com (the account must be listed in ADMIN_EMAILS)");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await promoteConfiguredAdmin(User, email);
  console.log(`Administrator access enabled for ${user.email}.`);
}

run().catch(error => {
  // Connection failures can contain sensitive server configuration.
  console.error("Administrator promotion failed. Verify the account, ADMIN_EMAILS, and database access.");
  if (!process.env.MONGODB_URI || !isConfiguredAdmin(process.argv[2])) console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
