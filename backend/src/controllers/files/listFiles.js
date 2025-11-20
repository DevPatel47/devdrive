/**
 * Lists folders and files within the authenticated user's prefix while also
 * calculating per-folder usage so the UI can render quota insights.
 */
import { normalizePrefix } from "../../utils/keySanitizer.js";
import { withUserPrefix, stripUserPrefix } from "../../utils/userRoot.js";
import { listObjects, calculatePrefixUsage } from "../../services/s3Service.js";

const buildFolderUsage = async (folders, userPrefix) => {
  const folderUsages = await Promise.all(
    folders.map(async (folder) => {
      const absoluteFolderPrefix = withUserPrefix(userPrefix, folder.key);
      const usage = await calculatePrefixUsage(absoluteFolderPrefix);
      return { key: folder.key, usage };
    })
  );

  const usageByKey = folderUsages.reduce((acc, entry) => {
    acc[entry.key] = entry.usage;
    return acc;
  }, {});

  return folders.map((folder) => ({
    ...folder,
    totalBytes: usageByKey[folder.key]?.totalBytes || 0,
    objectCount: usageByKey[folder.key]?.objectCount || 0,
  }));
};

const listFiles = async (req, res) => {
  const relativePrefix = normalizePrefix(req.query.prefix || "");
  const absolutePrefix = withUserPrefix(req.user.rootPrefix, relativePrefix);
  const data = await listObjects(absolutePrefix);

  const folders = (data.CommonPrefixes || []).map(({ Prefix }) => {
    const relativeKey = stripUserPrefix(req.user.rootPrefix, Prefix);
    return {
      key: relativeKey,
      name: relativeKey.replace(relativePrefix, "").replace(/\/$/, ""),
    };
  });

  const foldersWithUsage = await buildFolderUsage(folders, req.user.rootPrefix);

  const files = (data.Contents || [])
    .map((item) => {
      if (!item.Key || item.Key === absolutePrefix) return null;
      const relativeKey = stripUserPrefix(req.user.rootPrefix, item.Key);
      if (relativeKey === relativePrefix) return null;
      return {
        key: relativeKey,
        name: relativeKey.split("/").filter(Boolean).pop(),
        size: item.Size,
        lastModified: item.LastModified,
      };
    })
    .filter(Boolean);

  res.json({
    prefix: relativePrefix,
    folders: foldersWithUsage,
    files,
    nextContinuationToken: data.NextContinuationToken || null,
  });
};

export default listFiles;
