/**
 * Creates an empty folder placeholder (S3 prefix) after sanitizing the
 * requested path and ensuring the target does not already exist.
 */
import { sanitizeSegment, normalizePrefix } from "../../utils/keySanitizer.js";
import { withUserKey } from "../../utils/userRoot.js";
import {
  ensureTargetAvailable,
  createFolderPlaceholder,
} from "../../services/s3Service.js";

const createFolderController = async (req, res) => {
  const { prefix = "", name } = req.body || {};
  const folderName = sanitizeSegment(name);
  const safePrefix = normalizePrefix(prefix || "");
  const folderKey = `${safePrefix}${folderName}/`.replace(/\/{2,}/g, "/");
  const absoluteKey = withUserKey(req.user.rootPrefix, folderKey);

  await ensureTargetAvailable(absoluteKey, { isFolder: true });
  await createFolderPlaceholder(absoluteKey);
  res.status(201).json({ key: folderKey });
};

export default createFolderController;
