import nodemailer from "nodemailer";
import config from "../config/env.js";
import logger from "../config/logger.js";

let transporter = null;

if (config.mail.enabled) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
    connectionTimeout: config.mail.connectionTimeout,
    socketTimeout: config.mail.socketTimeout,
    greetingTimeout: config.mail.greetingTimeout,
    logger: config.mail.debug,
    debug: config.mail.debug,
  });

  transporter
    .verify()
    .then(() => {
      logger.info({ host: config.mail.host }, "SMTP transport verified");
    })
    .catch((error) => {
      logger.error(
        { err: error, host: config.mail.host },
        "SMTP transport verification failed"
      );
    });
}

const sendMail = async ({ to, subject, text, html }) => {
  if (!config.mail.enabled || !transporter) {
    logger.info(
      { to, subject },
      "Email skipped because SMTP is not configured"
    );
    return false;
  }

  try {
    const start = Date.now();
    const info = await transporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
    });
    const durationMs = Date.now() - start;
    logger.debug(
      { to, subject, durationMs, messageId: info?.messageId },
      "Email delivered via SMTP"
    );
    return true;
  } catch (error) {
    logger.error({ err: error, to, subject }, "Failed to send email via SMTP");
    return false;
  }
};

export const notifyAdminsOfPendingUser = async ({ username }) => {
  if (!config.admin.notificationEmails.length) return;
  const subject = `[DevDrive] Approval needed for ${username}`;
  const text = `A new user (username: ${username}) has completed MFA setup and is waiting for approval.`;
  await sendMail({
    to: config.admin.notificationEmails,
    subject,
    text,
    html: `<p>${text}</p><p>Sign in to the admin dashboard to approve or deny this request.</p>`,
  });
};

export const notifyUserApproved = async ({ username, email }) => {
  if (!email) return;
  const subject = "Your DevDrive account was approved";
  const text = `Hi ${username}, your DevDrive account is now approved. You can sign in and start uploading files.`;
  await sendMail({ to: email, subject, text, html: `<p>${text}</p>` });
};

export const sendEmailVerificationCode = async ({ username, email, code }) => {
  if (!email) {
    logger.warn(
      { username },
      "Cannot send email verification code without email"
    );
    return;
  }
  const subject = "Your DevDrive verification code";
  const text = `Hi ${username}, your DevDrive email verification code is ${code}. This code expires in 2 minutes.`;
  const delivered = await sendMail({
    to: email,
    subject,
    text,
    html: `<p>${text}</p>`,
  });
  if (!delivered) {
    logger.info(
      { username, code },
      "Email verification code logged because SMTP delivery failed"
    );
  }
};

export default {
  notifyAdminsOfPendingUser,
  notifyUserApproved,
  sendEmailVerificationCode,
};
