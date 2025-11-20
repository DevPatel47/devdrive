/**
 * Moves files or folders by copying the object tree to a new prefix and
 * removing the original source. Validates inputs to prevent self-recursive
 * moves.
 */
import ApiError from "../../utils/apiError.js";
import {
  sanitizeKey,
  normalizePrefix,
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

const moveObjectController = async (req, res) => {
  const { sourceKey, destinationPrefix = "" } = req.body || {};
  const folderCandidate = isFolderKey(sourceKey);
  const normalizedSource = sanitizeKey(sourceKey, {
    allowEmpty: false,
    expectFolder: folderCandidate,
  });
  const safeSourceKey = folderCandidate
    ? normalizedSource.replace(/\/$/, "")
    : normalizedSource;
  const safeDestinationPrefix = normalizePrefix(destinationPrefix);
  const itemName = safeSourceKey.split("/").filter(Boolean).pop();
  const targetKey = `${safeDestinationPrefix}${itemName}${
    folderCandidate ? "/" : ""
  }`;
  const comparisonTarget = folderCandidate
    ? targetKey.replace(/\/$/, "")
    : targetKey;

  if (safeSourceKey === comparisonTarget) {
    throw new ApiError(400, "Source and destination are identical");
  }

  const absoluteSource = withUserKey(
    req.user.rootPrefix,
    folderCandidate ? `${safeSourceKey}/` : safeSourceKey
  );
  const absoluteTarget = withUserKey(req.user.rootPrefix, targetKey);

  if (folderCandidate) {
    const sourceFolderKey = absoluteSource.endsWith("/")
      ? absoluteSource
      : `${absoluteSource}/`;
    const destinationFolderKey = absoluteTarget.endsWith("/")
      ? absoluteTarget
      : `${absoluteTarget}/`;
    if (destinationFolderKey.startsWith(sourceFolderKey)) {
      throw new ApiError(400, "Cannot move a folder inside itself");
    }
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

export default moveObjectController;
