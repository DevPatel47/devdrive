/**
 * Deletes either a single object or an entire pseudo-folder on behalf of the
 * authenticated user.
 */
import { sanitizeKey, isFolderKey } from "../../utils/keySanitizer.js";
import { withUserKey } from "../../utils/userRoot.js";
import {
  ensureObjectExists,
  deleteObjectByKey,
  deleteFolderObjects,
} from "../../services/s3Service.js";

const deleteObjectController = async (req, res) => {
  const rawKey = req.query.key;
  const folderCandidate = isFolderKey(rawKey);
  const safeKey = sanitizeKey(rawKey, {
    allowEmpty: false,
    expectFolder: folderCandidate,
  });

  const absoluteKey = withUserKey(req.user.rootPrefix, safeKey);

  if (folderCandidate) {
    await deleteFolderObjects(
      absoluteKey.endsWith("/") ? absoluteKey : `${absoluteKey}/`
    );
    return res.json({ success: true });
  }

  await ensureObjectExists(absoluteKey);
  await deleteObjectByKey(absoluteKey);
  res.json({ success: true });
};

export default deleteObjectController;
