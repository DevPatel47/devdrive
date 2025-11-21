import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import SibApiV3Sdk from "@sendinblue/client";
import config from "../config/env.js";
import logger from "../config/logger.js";

const provider = config.mail.provider;
let transporter = null;
let sendgridReady = false;
let brevoClient = null;
let brevoReady = false;

/**
 * Parses strings like `"Sender" <sender@example.com>` so provider SDKs can use them.
 * @param {string | undefined} value
 * @returns {{ email?: string, name?: string }}
 */
const parseAddress = (value) => {
  if (!value) return {};
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: trimmed };
};

/**
 * Ensures recipients are expressed as a string array.
 * @param {string | string[] | undefined} value
 * @returns {string[]}
 */
const normalizeRecipients = (value) => {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
};

if (provider === "smtp" && config.mail.enabled) {
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
} else if (provider === "sendgrid" && config.mail.enabled) {
  try {
    sgMail.setApiKey(config.mail.sendgridApiKey);
    sendgridReady = true;
    logger.info("SendGrid mail provider configured");
  } catch (error) {
    logger.error({ err: error }, "Failed to configure SendGrid provider");
  }
} else if (provider === "brevo" && config.mail.enabled) {
  try {
    brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
    brevoClient.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      config.mail.brevoApiKey
    );
    brevoReady = true;
    logger.info("Brevo mail provider configured");
  } catch (error) {
    logger.error({ err: error }, "Failed to configure Brevo provider");
  }
}

/**
 * Indicates whether the configured mail transport has finished initializing.
 * @returns {boolean}
 */
const isMailReady = () => {
  if (!config.mail.enabled) return false;
  if (provider === "smtp") return Boolean(transporter);
  if (provider === "sendgrid") return sendgridReady;
  if (provider === "brevo") return brevoReady;
  return false;
};

/**
 * Sends an email using the active provider implementation.
 * @param {{ to: string | string[], subject: string, text?: string, html?: string }} payload
 * @returns {Promise<boolean>} True if the provider accepted the message.
 */
const sendMail = async ({ to, subject, text, html }) => {
  if (!isMailReady()) {
    logger.info(
      { to, subject, provider },
      "Email skipped because mail transport is not configured"
    );
    return false;
  }

  if (provider === "sendgrid") {
    try {
      const start = Date.now();
      const [response] = await sgMail.send({
        from: config.mail.from,
        to,
        subject,
        text,
        html,
      });
      const durationMs = Date.now() - start;
      logger.debug(
        {
          to,
          subject,
          durationMs,
          provider,
          statusCode: response?.statusCode,
        },
        "Email delivered via SendGrid"
      );
      return true;
    } catch (error) {
      logger.error(
        { err: error, to, subject, provider },
        "Failed to send email via SendGrid"
      );
      return false;
    }
  }

  if (provider === "brevo") {
    try {
      const start = Date.now();
      const sender = parseAddress(config.mail.from);
      const recipientList = normalizeRecipients(to).map((email) => ({
        email,
      }));
      if (!sender.email) {
        throw new Error("MAIL_FROM must be a valid email address for Brevo");
      }
      if (!recipientList.length) {
        throw new Error("No recipients provided for Brevo email");
      }
      const response = await brevoClient.sendTransacEmail({
        sender,
        to: recipientList,
        subject,
        textContent: text,
        htmlContent: html,
      });
      const durationMs = Date.now() - start;
      logger.debug(
        {
          to: recipientList.map((entry) => entry.email),
          subject,
          durationMs,
          provider,
          messageId: response?.body?.messageId,
        },
        "Email delivered via Brevo"
      );
      return true;
    } catch (error) {
      logger.error(
        { err: error, to, subject, provider },
        "Failed to send email via Brevo"
      );
      return false;
    }
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

/**
 * Alerts configured admins that a user awaits manual approval.
 * @param {{ username: string }} payload
 */
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

/**
 * Notifies an end user that their account is approved.
 * @param {{ username: string, email?: string }} payload
 */
export const notifyUserApproved = async ({ username, email }) => {
  if (!email) return;
  const subject = "Your DevDrive account was approved";
  const text = `Hi ${username}, your DevDrive account is now approved. You can sign in and start uploading files.`;
  await sendMail({ to: email, subject, text, html: `<p>${text}</p>` });
};

/**
 * Sends a short-lived email verification OTP.
 * @param {{ username: string, email?: string, code: string }} payload
 */
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
      "Email verification code logged because mail delivery failed"
    );
  }
};

export default {
  notifyAdminsOfPendingUser,
  notifyUserApproved,
  sendEmailVerificationCode,
};
