import ApiError from "./apiError.js";

const ensureTrailingSlash = (value = "") =>
  value.endsWith("/") ? value : `${value.replace(/\/$/, "")}/`;

export const buildUserRoot = (identifier) =>
  ensureTrailingSlash(`users/${identifier}`);

export const withUserKey = (rootPrefix, relativeKey) => {
  const root = ensureTrailingSlash(rootPrefix || "");
  if (!relativeKey) return root.slice(0, -1);
  return `${root}${relativeKey}`.replace(/\/{2,}/g, "/");
};

export const withUserPrefix = (rootPrefix, relativePrefix) => {
  const root = ensureTrailingSlash(rootPrefix || "");
  const normalized = relativePrefix ? ensureTrailingSlash(relativePrefix) : "";
  return `${root}${normalized}`.replace(/\/{2,}/g, "/");
};

export const stripUserPrefix = (rootPrefix, absoluteKey) => {
  const root = ensureTrailingSlash(rootPrefix || "");
  if (!absoluteKey.startsWith(root)) {
    throw new ApiError(403, "Object is outside of your storage root");
  }
  return absoluteKey.slice(root.length);
};

export default {
  buildUserRoot,
  withUserKey,
  withUserPrefix,
  stripUserPrefix,
};
