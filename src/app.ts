import express, { type ErrorRequestHandler } from "express";
import { createAuthRouter } from "./auth.ts";
import { databasePool } from "./database.ts";
import { createTwilioSmsSender } from "./twilio-sms.ts";

export const app = express();

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
const smsSender =
  twilioAccountSid && twilioAuthToken && twilioPhoneNumber
    ? createTwilioSmsSender({
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        fromPhoneNumber: twilioPhoneNumber,
      })
    : null;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(process.cwd(), { dotfiles: "ignore" }));
app.use("/api/auth", createAuthRouter({
  pool: databasePool,
  otpHashSecret: process.env.OTP_HASH_SECRET,
  smsSender,
}));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "raahi-api" });
});

app.get("/api/ready", async (_request, response) => {
  if (!databasePool) {
    response.status(503).json({
      ready: false,
      database: "not_configured",
    });
    return;
  }

  try {
    await databasePool.query("SELECT 1");
    response.json({ ready: true, database: "connected" });
  } catch (error) {
    console.error("Database readiness check failed:", error);
    response.status(503).json({ ready: false, database: "unavailable" });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: "Request body must contain valid JSON." });
    return;
  }

  console.error("Unhandled API error:", error);
  response.status(500).json({ error: "Internal server error" });
};

app.use(handleError);
