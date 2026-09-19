import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authRoutes from "./auth.js";

test("public authentication never promotes an unverified allowlisted email; existing admins keep access", async t => {
  const previousSecret = process.env.JWT_SECRET;
  const previousEmails = process.env.ADMIN_EMAILS;
  process.env.JWT_SECRET = "local-auth-test-secret";
  process.env.ADMIN_EMAILS = "owner@example.com,new-owner@example.com";
  t.after(() => {
    if (previousSecret == null) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousEmails == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousEmails;
  });
  const save = t.mock.fn();
  const user = { _id: "507f1f77bcf86cd799439011", name: "Owner", email: "owner@example.com", role: "user", comparePassword: async () => true, save };
  t.mock.method(User, "findOne", async ({ email }) => email === "new-owner@example.com" ? null : user);
  t.mock.method(User, "findById", async () => user);
  const create = t.mock.method(User, "createWithPassword", async () => ({ ...user, email: "new-owner@example.com" }));

  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/auth`;
  const post = (path, body) => fetch(url + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const signup = await post("/signup", { name: "New Owner", email: "new-owner@example.com", password: "validpassword", role: "admin" });
  assert.equal(signup.status, 201);
  assert.equal((await signup.json()).user.role, "user");
  assert.equal(create.mock.calls[0].arguments[0].role, undefined);
  assert.equal((await (await post("/login", { email: user.email, password: "validpassword" })).json()).user.role, "user");
  const me = await fetch(url + "/me", { headers: { authorization: `Bearer ${jwt.sign({ sub: user._id }, process.env.JWT_SECRET)}` } });
  assert.equal((await me.json()).user.role, "user");
  assert.equal(save.mock.callCount(), 0);

  user.role = "admin";
  assert.equal((await (await post("/login", { email: user.email, password: "validpassword" })).json()).user.role, "admin");
});

test("preferences save normalized schedule conferences", async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "local-auth-test-secret";
  t.after(() => {
    if (previousSecret == null) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const user = {
    _id: "507f1f77bcf86cd799439011",
    name: "Fan",
    email: "fan@example.com",
    role: "user",
    favoriteTeams: ["Memphis"],
    scheduleConferences: ["SEC", "American"],
    theme: { mode: "default", team: null },
  };
  const update = t.mock.method(User, "findByIdAndUpdate", async (_id, changes) => ({ ...user, ...changes }));
  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/preferences`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${jwt.sign({ sub: user._id }, process.env.JWT_SECRET)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      favoriteTeams: ["Memphis"],
      scheduleConferences: [" SEC ", "American", "SEC"],
      theme: { mode: "default", team: null },
      timeZone: "America/Chicago",
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1].scheduleConferences, ["SEC", "American"]);
  assert.deepEqual((await response.json()).user.scheduleConferences, ["SEC", "American"]);
});
