import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const parseList = (value, { lowercase = false } = {}) => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (lowercase ? entry.toLowerCase() : entry));
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  LOG_LEVEL: z.string().optional(),
  FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  MAX_UPLOAD_BYTES: z.coerce.number().default(104_857_600),
  DEFAULT_USER_QUOTA_BYTES: z.coerce.number().default(107_374_182_400),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  SESSION_ACCESS_TTL: z.coerce.number().default(86_400),
  SESSION_REFRESH_TTL: z.coerce.number().default(604_800),
  HTTPS_ONLY_COOKIES: z.string().optional(),
  AUTH_ISSUER_NAME: z.string().default("DevDrive"),
  ADMIN_AUTO_APPROVE_USERS: z.string().optional(),
  ADMIN_NOTIFICATION_EMAILS: z.string().optional(),
  MAIL_SMTP_HOST: z.string().optional(),
  MAIL_SMTP_PORT: z.coerce.number().default(587),
  MAIL_SMTP_USER: z.string().optional(),
  MAIL_SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_SMTP_SECURE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten());
  process.exit(1);
}

const env = parsed.data;

const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  frontendOrigin: env.FRONTEND_ORIGIN,
  mongoUri: env.MONGODB_URI,
  log: {
    level: env.LOG_LEVEL || (env.NODE_ENV === "production" ? "info" : "debug"),
  },
  admin: {
    autoApproveUsernames: parseList(env.ADMIN_AUTO_APPROVE_USERS, {
      lowercase: true,
    }),
    notificationEmails: parseList(env.ADMIN_NOTIFICATION_EMAILS),
  },
  aws: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    bucket: env.S3_BUCKET,
  },
  storage: {
    maxUploadBytes: env.MAX_UPLOAD_BYTES,
    defaultUserQuotaBytes: env.DEFAULT_USER_QUOTA_BYTES,
  },
  session: {
    secret: env.SESSION_SECRET,
    accessTtl: env.SESSION_ACCESS_TTL,
    refreshTtl: env.SESSION_REFRESH_TTL,
    secureCookies:
      env.HTTPS_ONLY_COOKIES === "true" || env.NODE_ENV === "production",
  },
  auth: {
    issuer: env.AUTH_ISSUER_NAME,
  },
  mail: {
    host: env.MAIL_SMTP_HOST,
    port: env.MAIL_SMTP_PORT,
    user: env.MAIL_SMTP_USER,
    pass: env.MAIL_SMTP_PASS,
    from: env.MAIL_FROM || env.MAIL_SMTP_USER,
    secure: env.MAIL_SMTP_SECURE === "true",
    enabled:
      Boolean(env.MAIL_SMTP_HOST) &&
      Boolean(env.MAIL_SMTP_USER) &&
      Boolean(env.MAIL_SMTP_PASS),
  },
};

export default config;
