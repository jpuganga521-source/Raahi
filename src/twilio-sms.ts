import twilio from "twilio";
import type { SmsSender } from "./auth.ts";

interface TwilioSmsConfig {
  accountSid: string;
  authToken: string;
  fromPhoneNumber: string;
}

export function createTwilioSmsSender(config: TwilioSmsConfig): SmsSender {
  const client = twilio(config.accountSid, config.authToken);

  return {
    async sendVerificationCode(phone, code) {
      await client.messages.create({
        to: phone,
        from: config.fromPhoneNumber,
        body: `Your Raahi verification code is ${code}. It expires in 5 minutes.`,
      });
    },
  };
}
