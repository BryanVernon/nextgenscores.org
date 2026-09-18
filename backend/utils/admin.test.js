import test from "node:test";
import assert from "node:assert/strict";
import { promoteConfiguredAdmin } from "./admin.js";

test("trusted admin promotion requires an allowlisted existing account", async t => {
  const previousEmails = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@example.com";
  t.after(() => {
    if (previousEmails == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousEmails;
  });
  const User = { findOneAndUpdate: t.mock.fn(() => ({ select: async () => ({ email: "owner@example.com", role: "admin" }) })) };
  await assert.rejects(promoteConfiguredAdmin(User, "stranger@example.com"));
  assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  const user = await promoteConfiguredAdmin(User, " OWNER@example.com ");
  assert.equal(user.role, "admin");
  assert.deepEqual(User.findOneAndUpdate.mock.calls[0].arguments, [
    { email: "owner@example.com" }, { $set: { role: "admin" } }, { new: true },
  ]);
  User.findOneAndUpdate = () => ({ select: async () => null });
  await assert.rejects(promoteConfiguredAdmin(User, "owner@example.com"), /No account exists/);
});
