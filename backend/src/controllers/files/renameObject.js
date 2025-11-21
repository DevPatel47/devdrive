/**
 * Handles renaming files or folders by delegating to the S3 helpers for either
 * copy/delete or folder relocation semantics.
 */
import ApiError from "../../utils/apiError.js";
import {
  sanitizeKey,
  sanitizeSegment,
  isFolderKey,
} from "../../utils/keySanitizer.js";
import { withUserKey } from "../../utils/userRoot.js";
import {
  ensureObjectExists,
  ensureTargetAvailable,
  relocateFolder,
  copyObject,
  deleteObjectByKey,
} from "../../services/s3Service.js";

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const renameObjectController = async (req, res) => {
  const { key, newName } = req.body || {};
  const folderCandidate = isFolderKey(key);
  const normalizedKey = sanitizeKey(key, {
    allowEmpty: false,
    expectFolder: folderCandidate,
  });
  const safeKey = folderCandidate
    ? normalizedKey.replace(/\/$/, "")
    : normalizedKey;
  const safeName = sanitizeSegment(newName);
  const parentPrefix = safeKey.includes("/")
    ? `${safeKey.slice(0, safeKey.lastIndexOf("/") + 1)}`
    : "";
  const targetKey = `${parentPrefix}${safeName}${folderCandidate ? "/" : ""}`;
  const comparisonTarget = folderCandidate
    ? targetKey.replace(/\/$/, "")
    : targetKey;

  if (safeKey === comparisonTarget) {
    throw new ApiError(400, "No changes detected");
  }

  const absoluteSource = withUserKey(
    req.user.rootPrefix,
    folderCandidate ? `${safeKey}/` : safeKey
  );
  const absoluteTarget = withUserKey(req.user.rootPrefix, targetKey);

  if (folderCandidate) {
    const sourceFolderKey = absoluteSource.endsWith("/")
      ? absoluteSource
      : `${absoluteSource}/`;
    const destinationFolderKey = absoluteTarget.endsWith("/")
      ? absoluteTarget
      : `${absoluteTarget}/`;
    await relocateFolder(
      sourceFolderKey.replace(/\/{2,}/g, "/"),
      destinationFolderKey.replace(/\/{2,}/g, "/")
    );
  } else {
    await ensureTargetAvailable(absoluteTarget, { isFolder: false });
    await ensureObjectExists(absoluteSource);
    await copyObject(absoluteSource, absoluteTarget);
    await deleteObjectByKey(absoluteSource);
  }

  res.json({ key: targetKey });
};

export default renameObjectController;
