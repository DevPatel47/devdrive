import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config/env.js";
import ApiError from "../utils/apiError.js";

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const bucket = config.aws.bucket;

/**
 * Encodes an S3 copy source header while preserving path slashes.
 * @param {string} bucketName
 * @param {string} key
 * @returns {string}
 */
const encodeCopySource = (bucketName, key) => {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/");
  return `${bucketName}/${encodedKey}`;
};

/**
 * Lists objects under a prefix with optional pagination options.
 * @param {string} prefix
 * @param {{ delimiter?: string, continuationToken?: string }} [options]
 */
export const listObjects = async (prefix, options = {}) => {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: options.delimiter ?? "/",
    ContinuationToken: options.continuationToken,
  });
  return s3.send(command);
};

/**
 * Streams through every object under a prefix and returns aggregate metrics.
 * @param {string} prefix
 * @returns {Promise<{ totalBytes: number, objectCount: number }>}
 */
export const calculatePrefixUsage = async (prefix) => {
  let continuationToken;
  let totalBytes = 0;
  let objectCount = 0;
  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(command);
    (response.Contents || []).forEach((item) => {
      if (!item?.Key) return;
      totalBytes += Number(item.Size) || 0;
      objectCount += 1;
    });
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return { totalBytes, objectCount };
};

/**
 * Collects every key under a prefix (used for recursive operations).
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
export const listAllKeys = async (prefix) => {
  const keys = [];
  let continuationToken;
  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(command);
    (response.Contents || []).forEach((item) => {
      if (item.Key) keys.push(item.Key);
    });
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  return keys;
};

/**
 * Deletes up to 1000 objects per batch, respecting AWS API limits.
 * @param {string[]} keys
 */
export const deleteKeys = async (keys) => {
  if (!keys.length) return;
  const queue = [...keys];
  while (queue.length) {
    const batch = queue.splice(0, 1000);
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: batch.map((Key) => ({ Key })),
        Quiet: true,
      },
    });
    await s3.send(command);
  }
};

/**
 * Removes every object that belongs to a folder-like prefix.
 * @param {string} prefix
 */
export const deleteFolderObjects = async (prefix) => {
  if (!prefix.endsWith("/")) {
    throw new ApiError(400, "Folder prefix must end with a slash");
  }
  const keys = await listAllKeys(prefix);
  if (!keys.length) {
    throw new ApiError(404, "Folder not found");
  }
  await deleteKeys(keys);
};

/**
 * Confirms an object exists, throwing an ApiError if it does not.
 * @param {string} key
 */
export const ensureObjectExists = async (key) => {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) {
      throw new ApiError(404, "Object not found");
    }
    throw error;
  }
};

/**
 * Validates that a destination key or folder is unused before writing to it.
 * @param {string} key
 * @param {{ isFolder?: boolean }} [options]
 */
export const ensureTargetAvailable = async (key, { isFolder = false } = {}) => {
  if (isFolder) {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: key.endsWith("/") ? key : `${key}/`,
        MaxKeys: 1,
      })
    );
    if (response.KeyCount) {
      throw new ApiError(409, "Destination folder already exists");
    }
    return;
  }

  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    throw new ApiError(409, "Destination file already exists");
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) {
      return;
    }
    throw error;
  }
};

/**
 * Copies an object to a new key using server-side copy.
 * @param {string} sourceKey
 * @param {string} targetKey
 */
export const copyObject = async (sourceKey, targetKey) => {
  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: encodeCopySource(bucket, sourceKey),
    Key: targetKey,
    MetadataDirective: "COPY",
  });
  await s3.send(command);
};

/**
 * Removes a single object by key.
 * @param {string} key
 */
export const deleteObjectByKey = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3.send(command);
};

/**
 * Moves every object under the source prefix to a new folder and deletes the old copies.
 * @param {string} sourcePrefix
 * @param {string} targetPrefix
 */
export const relocateFolder = async (sourcePrefix, targetPrefix) => {
  if (!sourcePrefix.endsWith("/") || !targetPrefix.endsWith("/")) {
    throw new ApiError(400, "Folder prefixes must end with a slash");
  }
  await ensureTargetAvailable(targetPrefix, { isFolder: true });
  const keys = await listAllKeys(sourcePrefix);
  if (!keys.length) {
    throw new ApiError(404, "Folder not found");
  }
  for (const key of keys) {
    const relative = key.slice(sourcePrefix.length);
    const destinationKey = `${targetPrefix}${relative}`;
    await copyObject(key, destinationKey);
  }
  await deleteKeys(keys);
};

/**
 * Creates an empty object that represents an S3 pseudo-folder.
 * @param {string} folderKey
 */
export const createFolderPlaceholder = async (folderKey) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: folderKey.endsWith("/") ? folderKey : `${folderKey}/`,
    Body: "",
  });
  await s3.send(command);
};

/**
 * Makes sure a folder marker object is present without failing if it already exists.
 * @param {string} folderKey
 */
export const ensureFolderExists = async (folderKey) => {
  try {
    await createFolderPlaceholder(
      folderKey.endsWith("/") ? folderKey : `${folderKey}/`
    );
  } catch (error) {
    if (error?.name === "NoSuchBucket") {
      throw error;
    }
  }
};

/**
 * Generates a short-lived signed PUT URL for uploads.
 * @param {{ key: string, contentType: string }} params
 * @returns {Promise<{ url: string, expiresIn: number }>}
 */
export const createUploadUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 900 });
  return { url, expiresIn: 900 };
};

/**
 * Generates a short-lived signed GET URL for downloads.
 * @param {string} key
 * @returns {Promise<{ url: string, expiresIn: number }>}
 */
export const createDownloadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 900 });
  return { url, expiresIn: 900 };
};

export default {
  listObjects,
  calculatePrefixUsage,
  listAllKeys,
  deleteKeys,
  deleteFolderObjects,
  ensureObjectExists,
  ensureTargetAvailable,
  copyObject,
  deleteObjectByKey,
  relocateFolder,
  createFolderPlaceholder,
  ensureFolderExists,
  createUploadUrl,
  createDownloadUrl,
};
