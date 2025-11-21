import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { authLimiter } from "../middlewares/rateLimiters.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  registerInit,
  registerVerifyEmail,
  registerResendEmail,
  registerVerify,
  login,
  verifyMfa,
  refreshSession,
  logout,
  currentUser,
} from "../controllers/authController.js";

/** @type {import("express").Router} */
const router = Router();

router.post("/register/init", authLimiter, asyncHandler(registerInit));
router.post(
  "/register/email-verify",
  authLimiter,
  asyncHandler(registerVerifyEmail)
);
router.post(
  "/register/resend-email",
  authLimiter,
  asyncHandler(registerResendEmail)
);
router.post("/register/verify", authLimiter, asyncHandler(registerVerify));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/mfa", authLimiter, asyncHandler(verifyMfa));
router.post("/refresh", authLimiter, asyncHandler(refreshSession));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(currentUser));

export default router;
