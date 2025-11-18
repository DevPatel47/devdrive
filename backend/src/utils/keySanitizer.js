import ApiError from "./apiError.js";

const hasUnsafeTraversal = (value) => /\.\./.test(value || "");

export const sanitizeKey = (
  key,
  { allowEmpty = false, expectFolder = false } = {}
) => {
  if (key == null) {
    if (allowEmpty) return "";
    throw new ApiError(400, "Key is required");
  }

  let normalized = String(key).trim().replace(/\\/g, "/");
  if (!normalized) {
    if (allowEmpty) return "";
    throw new ApiError(400, "Key is required");
  }

  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  if (hasUnsafeTraversal(normalized)) {
    throw new ApiError(400, "Key contains invalid traversal characters");
  }

  normalized = normalized.replace(/\/{2,}/g, "/");
  if (!normalized && !allowEmpty) {
    throw new ApiError(400, "Key is required");
  }

  if (expectFolder && normalized && !normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }

  if (!expectFolder) {
    normalized = normalized.replace(/\/$/, "");
  }

  return normalized;
};

export const sanitizeSegment = (segment) => {
  if (typeof segment !== "string") {
    throw new ApiError(400, "Folder or file name must be a string");
  }
  const trimmed = segment.trim();
  if (!trimmed) {
    throw new ApiError(400, "Name is required");
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new ApiError(400, "Name cannot contain slashes");
  }
  if (hasUnsafeTraversal(trimmed)) {
    throw new ApiError(400, "Name contains invalid traversal characters");
  }
  return trimmed;
};

export const normalizePrefix = (prefix = "") => {
  if (!prefix || !String(prefix).trim()) return "";
  const key = sanitizeKey(prefix, { allowEmpty: true, expectFolder: true });
  return key;
};

export const isFolderKey = (value = "") =>
  String(value || "")
    .trim()
    .endsWith("/");

export default {
  sanitizeKey,
  sanitizeSegment,
  normalizePrefix,
  isFolderKey,
};
