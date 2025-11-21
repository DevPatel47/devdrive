/**
 * Generates a pre-signed upload URL after validating user quota and upload
 * size constraints.
 */
import ApiError from "../../utils/apiError.js";
import { sanitizeKey } from "../../utils/keySanitizer.js";
import { withUserKey } from "../../utils/userRoot.js";
import config from "../../config/env.js";
import {
  createUploadUrl,
  calculatePrefixUsage,
} from "../../services/s3Service.js";

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const createUploadUrlController = async (req, res) => {
  const {
    key,
    contentType = "application/octet-stream",
    contentLength,
  } = req.body || {};
  const safeKey = sanitizeKey(key);

  if (!contentLength || Number(contentLength) <= 0) {
    throw new ApiError(400, "contentLength is required");
  }

  const uploadBytes = Number(contentLength);
  const quota = Number(req.user.maxStorageBytes || 0);
  let remainingStorage = null;

  if (quota > 0) {
    const usage = await calculatePrefixUsage(req.user.rootPrefix);
    const usedBytes = Number(usage.totalBytes || 0);
    remainingStorage = Math.max(quota - usedBytes, 0);
    if (remainingStorage <= 0) {
      throw new ApiError(
        403,
        "Storage quota exhausted. Remove files or request more space."
      );
    }
  }

  const staticLimit = Number(config.storage.maxUploadBytes || 0);
  const maxAllowedBytes =
    quota > 0 ? remainingStorage : staticLimit > 0 ? staticLimit : null;

  if (maxAllowedBytes !== null && uploadBytes > maxAllowedBytes) {
    const message =
      quota > 0
        ? `Upload exceeds your remaining storage (${maxAllowedBytes} bytes available).`
        : "File exceeds allowed upload size.";
    throw new ApiError(413, message);
  }

  const absoluteKey = withUserKey(req.user.rootPrefix, safeKey);
  const result = await createUploadUrl({ key: absoluteKey, contentType });
  res.json(result);
};

export default createUploadUrlController;
