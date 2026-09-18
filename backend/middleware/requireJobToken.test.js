import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import requireJobToken from "./requireJobToken.js";

test("job trigger only accepts the configured bearer token", async t => {
  const previous = process.env.REMINDER_JOB_TOKEN;
  process.env.REMINDER_JOB_TOKEN = "test-reminder-token";
  t.after(() => {
    if (previous == null) delete process.env.REMINDER_JOB_TOKEN;
    else process.env.REMINDER_JOB_TOKEN = previous;
  });
  const app = express();
  app.post("/job", requireJobToken, (req, res) => res.status(202).json({ accepted: true }));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/job`;

  assert.equal((await fetch(url, { method: "POST" })).status, 401);
  assert.equal((await fetch(url, { method: "POST", headers: { authorization: "Bearer wrong-token" } })).status, 401);
  assert.equal((await fetch(url, { method: "POST", headers: { authorization: "Bearer test-reminder-token" } })).status, 202);
});
