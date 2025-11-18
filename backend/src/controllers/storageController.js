import { normalizePrefix } from "../utils/keySanitizer.js";
import { withUserPrefix } from "../utils/userRoot.js";
import { calculatePrefixUsage } from "../services/s3Service.js";

export const getFolderUsage = async (req, res) => {
  const relativePrefix = normalizePrefix(req.query.prefix || "");
  const absolutePrefix = withUserPrefix(req.user.rootPrefix, relativePrefix);
  const usage = await calculatePrefixUsage(absolutePrefix);
  res.json({ prefix: relativePrefix, ...usage });
};

export default {
  getFolderUsage,
};
