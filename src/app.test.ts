import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "./app.ts";

const server = app.listen(0, "127.0.0.1");
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint reports the API as available", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "raahi-api",
  });
});

test("unknown API routes return a JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not found" });
});

test("invalid JSON requests return a JSON 400", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Request body must contain valid JSON.",
  });
});

test("OTP requests reject phone numbers that are not in E.164 format", async () => {
  const response = await fetch(`${baseUrl}/api/auth/otp/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "9876543210" }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Provide a phone number in E.164 format.",
  });
});

test("OTP requests fail closed when an SMS provider is not configured", async () => {
  const response = await fetch(`${baseUrl}/api/auth/otp/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+919876543210" }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "OTP delivery is not configured.",
  });
});

test("profile requests require a bearer token", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required." });
});
