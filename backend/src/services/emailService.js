import nodemailer from "nodemailer";
import config from "../config/env.js";

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
  });
}

const sendMail = async ({ to, subject, text, html }) => {
  if (!config.mail.enabled || !transporter) {
    console.info(
      "Email not sent because SMTP is not configured. Message intended for %s with subject %s.",
      to,
      subject
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error(
      "Failed to send email to %s with subject %s: %s",
      to,
      subject,
      error.message
    );
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
    console.warn(
      "Cannot send email verification code without email for %s",
      username
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
    console.info(
      "[DevDrive] Email verification code for %s is %s (logged because SMTP delivery is disabled or failed)",
      username,
      code
    );
  }
};

export default {
  notifyAdminsOfPendingUser,
  notifyUserApproved,
  sendEmailVerificationCode,
};
