import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  listFiles,
  createUploadUrlController,
  createDownloadUrlController,
  deleteObjectController,
  createFolderController,
  renameObjectController,
  moveObjectController,
} from "../controllers/fileController.js";
import { getFolderUsage } from "../controllers/storageController.js";

const router = Router();

router.get("/files", requireAuth, asyncHandler(listFiles));
router.post(
  "/upload-url",
  requireAuth,
  asyncHandler(createUploadUrlController)
);
router.get(
  "/download-url",
  requireAuth,
  asyncHandler(createDownloadUrlController)
);
router.delete("/delete", requireAuth, asyncHandler(deleteObjectController));
router.post(
  "/create-folder",
  requireAuth,
  asyncHandler(createFolderController)
);
router.post("/rename", requireAuth, asyncHandler(renameObjectController));
router.post("/move", requireAuth, asyncHandler(moveObjectController));
router.get("/storage/usage", requireAuth, asyncHandler(getFolderUsage));

export default router;
