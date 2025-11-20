import speakeasy from "speakeasy";
import QRCode from "qrcode";
import config from "../../config/env.js";

export const generateTotpSecret = (username) =>
  speakeasy.generateSecret({
    name: `${config.auth.issuer} (${username})`,
    length: 32,
  });

export const ensureTotpSecret = (user) => {
  if (!user.totpSecret) {
    const secret = generateTotpSecret(user.username);
    user.totpSecret = secret.base32;
  }
};

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

export const verifyTotpCode = (secret, code) =>
  speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 1,
  });
