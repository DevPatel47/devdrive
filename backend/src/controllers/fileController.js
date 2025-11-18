import ApiError from "../utils/apiError.js";
import {
  sanitizeKey,
  sanitizeSegment,
  normalizePrefix,
  isFolderKey,
} from "../utils/keySanitizer.js";
import {
  withUserKey,
  withUserPrefix,
  stripUserPrefix,
} from "../utils/userRoot.js";
import config from "../config/env.js";
import {
  listObjects,
  ensureObjectExists,
  ensureTargetAvailable,
  deleteObjectByKey,
  deleteFolderObjects,
  relocateFolder,
  copyObject,
  createFolderPlaceholder,
  createUploadUrl,
  createDownloadUrl,
  calculatePrefixUsage,
} from "../services/s3Service.js";

export const listFiles = async (req, res) => {
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

  const folderUsages = await Promise.all(
    folders.map(async (folder) => {
      const absoluteFolderPrefix = withUserPrefix(
        req.user.rootPrefix,
        folder.key
      );
      const usage = await calculatePrefixUsage(absoluteFolderPrefix);
      return { key: folder.key, usage };
    })
  );

  const usageByKey = folderUsages.reduce((acc, entry) => {
    acc[entry.key] = entry.usage;
    return acc;
  }, {});

  const foldersWithUsage = folders.map((folder) => ({
    ...folder,
    totalBytes: usageByKey[folder.key]?.totalBytes || 0,
    objectCount: usageByKey[folder.key]?.objectCount || 0,
  }));

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

export const createUploadUrlController = async (req, res) => {
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

export const createDownloadUrlController = async (req, res) => {
  const safeKey = sanitizeKey(req.query.key);
  const absoluteKey = withUserKey(req.user.rootPrefix, safeKey);
  await ensureObjectExists(absoluteKey);
  const url = await createDownloadUrl(absoluteKey);
  res.json(url);
};

export const deleteObjectController = async (req, res) => {
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

export const createFolderController = async (req, res) => {
  const { prefix = "", name } = req.body || {};
  const folderName = sanitizeSegment(name);
  const safePrefix = normalizePrefix(prefix || "");
  const folderKey = `${safePrefix}${folderName}/`.replace(/\/{2,}/g, "/");
  const absoluteKey = withUserKey(req.user.rootPrefix, folderKey);

  await ensureTargetAvailable(absoluteKey, { isFolder: true });
  await createFolderPlaceholder(absoluteKey);
  res.status(201).json({ key: folderKey });
};

export const renameObjectController = async (req, res) => {
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

export const moveObjectController = async (req, res) => {
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

export default {
  listFiles,
  createUploadUrlController,
  createDownloadUrlController,
  deleteObjectController,
  createFolderController,
  renameObjectController,
  moveObjectController,
};
