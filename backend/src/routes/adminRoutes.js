import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
  listUsers,
  approveUser,
  updateUserQuota,
} from "../controllers/adminController.js";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/users", asyncHandler(listUsers));
router.post("/users/:id/approve", asyncHandler(approveUser));
router.post("/users/:id/quota", asyncHandler(updateUserQuota));

export default router;
