import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

const otpLifetimeMinutes = 5;
const otpRequestLimit = 3;
const otpRequestWindowMinutes = 15;
const otpAttemptLimit = 5;
const sessionLifetimeDays = 30;

export interface SmsSender {
  sendVerificationCode(phone: string, code: string): Promise<void>;
}

interface AuthDependencies {
  pool: Pool | null;
  otpHashSecret: string | undefined;
  smsSender: SmsSender | null;
}

interface OtpChallengeRow extends RowDataPacket {
  id: number;
  otp_hash: Buffer;
  attempts: number;
}

interface UserRow extends RowDataPacket {
  id: number;
  phone: string;
  full_name: string | null;
  role: "passenger" | "rider" | "admin";
  status: "active" | "blocked";
}

interface SessionUserRow extends RowDataPacket {
  id: number;
  phone: string;
  full_name: string | null;
  role: "passenger" | "rider" | "admin";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.trim();
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

function isConfiguredSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32;
}

function hashOtp(phone: string, code: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest();
}

function hashSessionToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function getBearerToken(request: Request): string | null {
  const authorization = request.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  return match?.[1] ?? null;
}

function sendUnavailable(response: Response, reason: string): void {
  response.status(503).json({ error: reason });
}

export function createAuthRouter({ pool, otpHashSecret, smsSender }: AuthDependencies) {
  const router = express.Router();

  router.post("/otp/request", async (request, response, next) => {
    const body: unknown = request.body;
    const phone = isRecord(body) ? normalizePhone(body.phone) : null;
    if (!phone) {
      response.status(400).json({ error: "Provide a phone number in E.164 format." });
      return;
    }

    if (!isConfiguredSecret(otpHashSecret) || !smsSender) {
      sendUnavailable(response, "OTP delivery is not configured.");
      return;
    }
    if (!pool) {
      sendUnavailable(response, "Authentication database is not configured.");
      return;
    }

    try {
      const [countRows] = await pool.execute<(RowDataPacket & { request_count: number })[]>(
        `SELECT COUNT(*) AS request_count
         FROM otp_challenges
         WHERE phone = ?
           AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${otpRequestWindowMinutes} MINUTE)`,
        [phone],
      );
      if (Number(countRows[0]?.request_count ?? 0) >= otpRequestLimit) {
        response.status(429).json({ error: "Too many code requests. Try again later." });
        return;
      }

      await pool.execute(
        "UPDATE otp_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE phone = ? AND consumed_at IS NULL",
        [phone],
      );
      const code = String(randomInt(100000, 1000000));
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO otp_challenges (phone, otp_hash, expires_at)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${otpLifetimeMinutes} MINUTE))`,
        [phone, hashOtp(phone, code, otpHashSecret)],
      );

      try {
        await smsSender.sendVerificationCode(phone, code);
      } catch (error) {
        await pool.execute(
          "UPDATE otp_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL",
          [result.insertId],
        );
        console.error("Could not deliver a phone verification code:", error);
        sendUnavailable(response, "Verification code delivery is unavailable.");
        return;
      }

      response.status(202).json({ message: "Verification code sent." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/otp/verify", async (request, response, next) => {
    const body: unknown = request.body;
    const phone = isRecord(body) ? normalizePhone(body.phone) : null;
    const code = isRecord(body) && typeof body.code === "string" ? body.code.trim() : "";
    if (!phone || !/^\d{6}$/.test(code)) {
      response.status(400).json({ error: "Provide a valid phone number and six-digit code." });
      return;
    }

    if (!pool) {
      sendUnavailable(response, "Authentication database is not configured.");
      return;
    }
    if (!isConfiguredSecret(otpHashSecret)) {
      sendUnavailable(response, "OTP verification is not configured.");
      return;
    }

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [challengeRows] = await connection.execute<OtpChallengeRow[]>(
        `SELECT id, otp_hash, attempts
         FROM otp_challenges
         WHERE phone = ?
           AND consumed_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC, id DESC
         LIMIT 1
         FOR UPDATE`,
        [phone],
      );
      const challenge = challengeRows[0];
      if (!challenge) {
        await connection.rollback();
        response.status(400).json({ error: "The code is invalid or expired." });
        return;
      }
      if (challenge.attempts >= otpAttemptLimit) {
        await connection.execute(
          "UPDATE otp_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [challenge.id],
        );
        await connection.commit();
        response.status(429).json({ error: "Too many verification attempts. Request a new code." });
        return;
      }

      const expectedHash = hashOtp(phone, code, otpHashSecret);
      const matches =
        Buffer.isBuffer(challenge.otp_hash) &&
        challenge.otp_hash.length === expectedHash.length &&
        timingSafeEqual(challenge.otp_hash, expectedHash);

      await connection.execute(
        `UPDATE otp_challenges
         SET attempts = attempts + 1${matches || challenge.attempts + 1 >= otpAttemptLimit ? ", consumed_at = CURRENT_TIMESTAMP" : ""}
         WHERE id = ?`,
        [challenge.id],
      );

      if (!matches) {
        await connection.commit();
        response.status(400).json({ error: "The code is invalid or expired." });
        return;
      }

      await connection.execute(
        "INSERT IGNORE INTO users (phone, role) VALUES (?, 'passenger')",
        [phone],
      );
      const [userRows] = await connection.execute<UserRow[]>(
        "SELECT id, phone, full_name, role, status FROM users WHERE phone = ? FOR UPDATE",
        [phone],
      );
      const user = userRows[0];
      if (!user || user.status !== "active") {
        await connection.commit();
        response.status(403).json({ error: "This account cannot sign in." });
        return;
      }

      const token = randomBytes(32).toString("base64url");
      await connection.execute(
        `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${sessionLifetimeDays} DAY))`,
        [user.id, hashSessionToken(token)],
      );
      await connection.commit();

      response.status(200).json({
        token,
        tokenType: "Bearer",
        expiresIn: sessionLifetimeDays * 24 * 60 * 60,
        user: {
          id: String(user.id),
          phone: user.phone,
          name: user.full_name,
          role: user.role,
        },
      });
    } catch (error) {
      if (connection) await connection.rollback();
      next(error);
    } finally {
      connection?.release();
    }
  });

  router.get("/me", async (request, response, next) => {
    const token = getBearerToken(request);
    if (!token) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!pool) {
      sendUnavailable(response, "Authentication database is not configured.");
      return;
    }

    try {
      const [rows] = await pool.execute<SessionUserRow[]>(
        `SELECT users.id, users.phone, users.full_name, users.role
         FROM auth_sessions
         INNER JOIN users ON users.id = auth_sessions.user_id
         WHERE auth_sessions.token_hash = ?
           AND auth_sessions.expires_at > CURRENT_TIMESTAMP
           AND users.status = 'active'`,
        [hashSessionToken(token)],
      );
      const user = rows[0];
      if (!user) {
        response.status(401).json({ error: "Session is invalid or expired." });
        return;
      }
      response.json({
        user: {
          id: String(user.id),
          phone: user.phone,
          name: user.full_name,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (request, response, next) => {
    const token = getBearerToken(request);
    if (!token) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!pool) {
      sendUnavailable(response, "Authentication database is not configured.");
      return;
    }

    try {
      await pool.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [hashSessionToken(token)]);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
