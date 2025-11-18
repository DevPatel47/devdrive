import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { health } from "../controllers/healthController.js";

const router = Router();

router.get("/", asyncHandler(health));

export default router;
