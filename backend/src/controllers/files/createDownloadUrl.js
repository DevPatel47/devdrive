/**
 * Provides a pre-signed download URL after ensuring the requested object
 * exists under the authenticated user's namespace.
 */
import { sanitizeKey } from "../../utils/keySanitizer.js";
import { withUserKey } from "../../utils/userRoot.js";
import {
  ensureObjectExists,
  createDownloadUrl,
} from "../../services/s3Service.js";

const createDownloadUrlController = async (req, res) => {
  const safeKey = sanitizeKey(req.query.key);
  const absoluteKey = withUserKey(req.user.rootPrefix, safeKey);
  await ensureObjectExists(absoluteKey);
  const url = await createDownloadUrl(absoluteKey);
  res.json(url);
};

export default createDownloadUrlController;
