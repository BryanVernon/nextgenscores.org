import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import requireMaintenance from "./requireMaintenance.js";

test("maintenance requires an authenticated administrator and a JSON POST", async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "local-maintenance-test-secret";
  t.after(() => {
    if (previousSecret == null) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  t.mock.method(User, "findById", id => ({ select: async () => ({ role: id === "administrator" ? "admin" : "user" }) }));
  let writes = 0;
  const app = express();
  app.use(express.json());
  app.post("/refresh", requireMaintenance, (req, res) => {
    writes++;
    res.json({ success: true });
  });
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/refresh`;
  const adminHeaders = { authorization: `Bearer ${jwt.sign({ sub: "administrator" }, process.env.JWT_SECRET)}` };
  const memberHeaders = { authorization: `Bearer ${jwt.sign({ sub: "member" }, process.env.JWT_SECRET)}`, "content-type": "application/json" };

  assert.equal((await fetch(url)).status, 404);
  assert.equal((await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  assert.equal((await fetch(url, { method: "POST", headers: memberHeaders, body: "{}" })).status, 403);
  assert.equal((await fetch(url, { method: "POST", headers: adminHeaders, body: "" })).status, 415);
  assert.equal(writes, 0);
  assert.equal((await fetch(url, { method: "POST", headers: { ...adminHeaders, "content-type": "application/json" }, body: "{}" })).status, 200);
  assert.equal(writes, 1);
});
