import speakeasy from "speakeasy";
import QRCode from "qrcode";
import config from "../../config/env.js";

/**
 * Creates a new TOTP secret tailored to the user's email.
 * @param {string} username
 */
export const generateTotpSecret = (username) =>
  speakeasy.generateSecret({
    name: `${config.auth.issuer} (${username})`,
    length: 32,
  });

/**
 * Populates the user's secret if it has not been set yet.
 * @param {import("../../models/User.js").default} user
 */
export const ensureTotpSecret = (user) => {
  if (!user.totpSecret) {
    const secret = generateTotpSecret(user.username);
    user.totpSecret = secret.base32;
  }
};

/**
 * Produces the QR code, secret, and otpauth URL that the UI displays.
 * @param {import("../../models/User.js").default} user
 */
export const buildTotpArtifacts = async (user) => {
  ensureTotpSecret(user);
  const otpauthUrl = speakeasy.otpauthURL({
    secret: user.totpSecret,
    label: `${config.auth.issuer} (${user.username})`,
    issuer: config.auth.issuer,
    encoding: "base32",
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1 });
  return {
    secret: user.totpSecret,
    otpauthUrl,
    qrCodeDataUrl,
  };
};

/**
 * Validates a user-submitted TOTP code allowing a small window for drift.
 * @param {string} secret
 * @param {string} code
 */
export const verifyTotpCode = (secret, code) =>
  speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 1,
  });
