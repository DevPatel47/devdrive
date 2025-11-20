import bcrypt from "bcryptjs";
import {
  generateEmailOtp,
  OTP_EXPIRATION_MS,
  RESEND_COOLDOWN_MS,
} from "./helpers.js";
import { sendEmailVerificationCode } from "../emailService.js";

export const prepareEmailVerificationSession = async ({ email }) => {
  const otpCode = generateEmailOtp();
  const otpHash = await bcrypt.hash(otpCode, 8);
  const now = Date.now();
  await sendEmailVerificationCode({
    username: email,
    email,
    code: otpCode,
  });
  return {
    otp: {
      code: otpHash,
      expiresAt: now + OTP_EXPIRATION_MS,
      sentAt: now,
    },
    codeExpiresIn: Math.floor(OTP_EXPIRATION_MS / 1000),
    resendAvailableIn: Math.floor(RESEND_COOLDOWN_MS / 1000),
  };
};
